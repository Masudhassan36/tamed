import { manuscriptExtension, PART_BYTES, type Attachment, type AttachmentKind, type SubmissionResponse } from "@/lib/submission-upload";

export class WriterFacingError extends Error {}

export async function postUpload(data: FormData): Promise<SubmissionResponse> {
  const response = await fetch("/api/submissions", { method: "POST", body: data, signal: AbortSignal.timeout(65_000) });
  const result = await response.json().catch(() => null) as (SubmissionResponse & { kind?: string }) | null;
  if (!response.ok && result?.kind === "submission-error" && typeof result.error === "string") {
    throw new WriterFacingError(result.error);
  }
  if (response.status === 413) throw new WriterFacingError("TAMED couldn’t send your files. Reload the submission page and try again.");
  if (!response.ok || !result || (data.get("action") === "finishUpload" && !result.submissionId)) {
    throw new WriterFacingError("TAMED couldn’t confirm your submission. Click Submit work again with the same details to check.");
  }
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
    progress(`Uploading ${kind === "manuscript" ? "manuscript" : "cover image"}…`);
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
  if (!extension) throw new WriterFacingError("Attach a DOC, DOCX, PDF, or TXT manuscript.");
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (extension === ".pdf" && !new TextDecoder().decode(header).includes("%PDF-")) {
    throw new WriterFacingError("TAMED couldn’t open your PDF. Open the original document and save a new copy as a PDF.");
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
  throw new WriterFacingError("TAMED couldn’t open your Word document. Open it in your writing app and save a new DOCX or PDF without a password.");
}

export async function validateCover(file: File, type: string) {
  if (!type.startsWith("image/")) throw new WriterFacingError("Choose an image for the cover, such as a PNG, JPEG, or WebP.");
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
  } catch {
    throw new WriterFacingError("TAMED couldn’t open your cover image. Save a new copy as a PNG, JPEG, or WebP and attach it again.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
