import { categorySlugs } from "@/lib/content";
import { callSubmissionScript, writerRejection } from "@/lib/submission-service";
import { EMAIL_PATTERN, isUploadId, manuscriptExtension, MAX_ATTACHMENT_BYTES, PART_BYTES, uploadSizeMessage, writerMessages, type Attachment } from "@/lib/submission-upload";

export const maxDuration = 60;

function fail(error: string, status = 400) {
  return Response.json({ kind: "submission-error", error }, { status });
}

function readAttachment(entry: FormDataEntryValue | null): Attachment | undefined {
  try {
    const file = typeof entry === "string" ? JSON.parse(entry) : null;
    if (typeof file?.name !== "string" || !file.name.trim() || file.name.length > 255 ||
        typeof file.type !== "string" || file.type.length > 100 ||
        !Number.isSafeInteger(file.size) || file.size <= 0) return;
    return { name: file.name, type: file.type, size: file.size };
  } catch {
    return;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && URL.canParse(origin) && new URL(origin).host !== host) {
    return fail("Open the TAMED submission page directly and try again.", 403);
  }
  if (Number(request.headers.get("content-length")) > 3_250_000) {
    return fail("TAMED couldn’t send your files. Reload the submission page and try again.", 413);
  }
  const form = await request.formData().catch(() => null);
  if (!form) return fail("TAMED couldn’t read your submission. Open the submission page and try again.");
  const read = (key: string) => String(form.get(key) ?? "").trim();
  const action = read("action");
  const uploadId = read("uploadId");
  const bcwoId = read("bcwoId");
  const verificationEmail = read("verificationEmail");
  if (!isUploadId(uploadId) || !["beginUpload", "uploadPart", "finishUpload"].includes(action)) {
    return fail("TAMED couldn’t continue your submission. Reload the page and try again.");
  }
  if (!bcwoId || bcwoId.length > 120) return fail("Enter your BCWO Registration ID or Team ID.");
  if (!EMAIL_PATTERN.test(verificationEmail) || verificationEmail.length > 254) return fail("Enter the email address used for BCWO registration.");
  let payload: object = { action, uploadId, bcwoId, verificationEmail };
  let fileLabel = "";

  if (action === "beginUpload") {
    const email = read("email");
    const title = read("title");
    const language = read("language");
    const writerName = read("writerName");
    const penName = read("penName");
    const publishPreference = read("publishPreference");
    const phone = read("phone");
    const deliveryAddress = read("deliveryAddress");
    const categories = categorySlugs.filter((slug) => form.getAll("categories").includes(slug));
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return fail("Enter a valid editorial contact email address.");
    if (!title || title.length > 300) return fail("Enter a title of 1–300 characters.");
    if (!["English", "Bengali"].includes(language)) return fail("Choose English or Bengali for the work’s language.");
    if (!["real-name", "pen-name", "anonymous"].includes(publishPreference)) return fail("Choose how your name should appear.");
    if (!categories.length) return fail("Choose at least one editorial category.");
    if (publishPreference === "pen-name" && !penName) return fail("Enter your pen name or choose another publication preference.");
    if (publishPreference !== "pen-name" && !writerName) return fail("Enter your full name for editorial records.");
    if (writerName.length > 200 || penName.length > 200 || phone.length > 100 || deliveryAddress.length > 1500) {
      return fail("Use up to 200 characters for each name, 100 for the phone number, and 1,500 for the address.");
    }
    if (["originalWork", "submissionPolicy", "contactConsent"].some((key) => form.get(key) !== "on")) {
      return fail("Accept all three declarations before submitting.");
    }
    const manuscript = readAttachment(form.get("manuscript"));
    const coverImage = readAttachment(form.get("coverImage"));
    if (!manuscript || !manuscriptExtension(manuscript.name)) return fail("Attach a nonempty DOC, DOCX, PDF, or TXT manuscript with a filename of up to 255 characters.");
    if (!coverImage || !coverImage.type.startsWith("image/")) return fail("Attach a nonempty cover image with a filename of up to 255 characters.");
    if (manuscript.size + coverImage.size > MAX_ATTACHMENT_BYTES) return fail(uploadSizeMessage, 413);
    payload = { ...payload, writerName, penName, email, phone, deliveryAddress, publishPreference, categories, title, language, manuscript, coverImage };
  }

  if (action === "uploadPart") {
    const kind = read("kind");
    const index = Number(read("index"));
    const part = form.get("part");
    if (!["manuscript", "coverImage"].includes(kind) || !/^\d+$/.test(read("index")) ||
        !Number.isInteger(index) || index >= Math.ceil(MAX_ATTACHMENT_BYTES / PART_BYTES)) return fail("Your file didn’t finish uploading. Click Submit work again.");
    fileLabel = kind === "manuscript" ? "manuscript" : "cover image";
    if (!(part instanceof File) || !part.size || part.size > PART_BYTES) return fail(`Your ${fileLabel} didn’t finish uploading. Reattach the file and try again.`);
    payload = { ...payload, kind, index, data: Buffer.from(await part.arrayBuffer()).toString("base64") };
  }

  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  const unavailable = "TAMED can’t accept submissions right now. Try again later or contact the editors if the problem continues.";
  if (!endpoint) return fail(unavailable, 503);
  try {
    const result = await callSubmissionScript(endpoint, payload, 45_000);
    if (result.protocol !== 1) return fail(unavailable, 503);
    const rejection = writerRejection(result);
    if (rejection) return fail(writerMessages[rejection], 422);
    if (result.success && result.submissionId) return Response.json({ submissionId: result.submissionId });
    if (result.success && action !== "finishUpload") return Response.json({});
    switch (result.code) {
      case "SESSION_EXPIRED": return fail("Your upload timed out. Reload the page, then submit again.", 409);
      case "SESSION_CHANGED": return fail("The submission details changed during upload. Reload the page and start the submission again.", 409);
      case "PART_INVALID": return fail(`TAMED couldn’t finish uploading the ${fileLabel || "attached file"}. Reattach the original file and try again.`, 422);
      case "MANUSCRIPT_INCOMPLETE": return fail("The manuscript did not finish uploading. Click Submit work again to resume.", 409);
      case "COVER_INCOMPLETE": return fail("The cover image did not finish uploading. Click Submit work again to resume.", 409);
      case "BUSY": return fail("TAMED is finishing another upload. Wait a few seconds and click Submit work again.", 503);
      case "REGISTER_ERROR": return fail("TAMED couldn’t check your BCWO registration. Try again shortly or contact the editors if it continues.", 503);
      case "DRIVE_ERROR": return fail(`TAMED couldn’t save your ${fileLabel || (result.stage === "saving manuscript" ? "manuscript" : result.stage === "saving cover" ? "cover image" : "files")}. Wait a moment and click Submit work again.`, 503);
      case "SHEET_ERROR": return fail("TAMED couldn’t save your submission. Wait a moment and click Submit work again.", 503);
      case "COMMIT_UNCERTAIN": return fail("TAMED could not confirm that the submission was saved. Click Submit work again with the same details to check. Contact the editors if this continues.", 503);
    }
  } catch {
    if (action === "finishUpload") return fail("TAMED couldn’t confirm that your submission was saved. Click Submit work again with the same details to check.", 504);
    return fail(fileLabel
      ? `The ${fileLabel} didn’t finish uploading. Wait a moment and click Submit work again.`
      : unavailable, 503);
  }
  return fail("TAMED could not confirm this upload. Try again with the same details, or contact the editors if it continues.", 502);
}
