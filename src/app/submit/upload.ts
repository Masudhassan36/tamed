import { manuscriptExtension, PART_BYTES, type Attachment, type AttachmentKind, type SubmissionResponse } from "@/lib/submission-upload";

export async function postUpload(data: FormData): Promise<SubmissionResponse> {
  const response = await fetch("/api/submissions", { method: "POST", body: data, signal: AbortSignal.timeout(65_000) });
  const result = await response.json().catch(() => null) as SubmissionResponse | null;
  if (typeof result?.error === "string") throw new Error(result.error);
  if (response.status === 413) throw new Error("TAMED rejected one upload request because of its size. Reload the form and try again.");
  if (!response.ok || !result) throw new Error("TAMED did not return an upload response. Click Submit work again with the same details.");
  return result;
}

export async function uploadAttachment(
  session: FormData,
  kind: AttachmentKind,
  file: File,
  progress: (message: string) => void,
) {
  const count = Math.ceil(file.size / PART_BYTES);
  for (let index = 0; index < count; index++) {
    progress(`Uploading ${kind === "manuscript" ? "manuscript" : "cover image"} (${index + 1} of ${count})…`);
    const data = new FormData();
    for (const [key, value] of session) data.set(key, value);
    data.set("action", "uploadPart");
    data.set("kind", kind);
    data.set("index", String(index));
    data.set("part", file.slice(index * PART_BYTES, (index + 1) * PART_BYTES));
    const result = await postUpload(data);
    if (result.submissionId) return result.submissionId;
  }
}

export function attachmentMetadata(file: File): Attachment {
  const extension = manuscriptExtension(file.name);
  const manuscriptTypes: Record<string, string> = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  const coverTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif", tif: "image/tiff", tiff: "image/tiff", heic: "image/heic", bmp: "image/bmp", svg: "image/svg+xml" };
  const type = extension ? manuscriptTypes[extension] : file.type.startsWith("image/") ? file.type : coverTypes[file.name.split(".").pop()?.toLowerCase() ?? ""];
  return { name: file.name, size: file.size, type: type || "" };
}

export async function validateManuscript(file: File) {
  const extension = manuscriptExtension(file.name);
  if (!extension) throw new Error("Attach a DOC, DOCX, PDF, or TXT manuscript.");
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (extension === ".pdf" && !new TextDecoder().decode(header).includes("%PDF-")) {
    throw new Error("The manuscript does not contain a PDF header. Open it in its original app and export a new PDF.");
  }
  if (extension !== ".docx") return;
  const tail = new DataView(await file.slice(Math.max(0, file.size - 65_557)).arrayBuffer());
  for (let offset = tail.byteLength - 22; offset >= 0; offset--) {
    if (tail.getUint32(offset, true) !== 0x06054b50 || offset + 22 + tail.getUint16(offset + 20, true) !== tail.byteLength) continue;
    const start = tail.getUint32(offset + 16, true);
    const length = tail.getUint32(offset + 12, true);
    if (start + length > file.size) break;
    const directory = new TextDecoder().decode(await file.slice(start, start + length).arrayBuffer());
    if (directory.includes("[Content_Types].xml") && directory.includes("word/document.xml")) return;
    break;
  }
  throw new Error("TAMED could not read the DOCX package. Open it in Word or Google Docs and save a new DOCX or PDF. If it is password protected, export an unlocked copy.");
}

export async function validateCover(file: File, type: string) {
  if (!type.startsWith("image/")) throw new Error("Choose an image for the cover, such as a PNG, JPEG, or WebP.");
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
  } catch {
    throw new Error("The cover image could not be opened. Re-export it as a PNG, JPEG, or WebP and reattach it.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
