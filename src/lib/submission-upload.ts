// Each multipart request stays below Vercel's 4.5 MB limit. A multiple of
// three also lets Apps Script join the base64 parts without interior padding.
export const PART_BYTES = 3_000_000;
export const MAX_ATTACHMENT_BYTES = 20_000_000;
export const MANUSCRIPT_EXTENSIONS = [".doc", ".docx", ".pdf", ".txt"];
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const uploadSizeMessage = "The manuscript and cover exceed 20 MB combined. Export a smaller copy of the manuscript or cover, then try again.";

export const writerMessages = {
  "not-found": "No BCWO registration matches this ID and email. Enter the Registration ID or Team ID and the email used to register.",
  inactive: "This BCWO registration is inactive. Contact the BCWO team to check your registration status.",
  "limit-reached": "This registration has reached its submission limit. Contact TAMED if you believe the limit is incorrect.",
};

export type VerificationStatus = keyof typeof writerMessages | "verified" | "incomplete" | "unavailable";
export type Attachment = { name: string; type: string; size: number };
export type AttachmentKind = "manuscript" | "coverImage";
export type SubmissionResponse = { error?: string; submissionId?: string };

export function isUploadId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

export function manuscriptExtension(name: string) {
  return MANUSCRIPT_EXTENSIONS.find((extension) => name.toLowerCase().endsWith(extension));
}
