import "server-only";
import { EMAIL_PATTERN, type VerificationStatus } from "./submission-upload";

type ScriptResult = {
  success: boolean;
  verified?: boolean;
  submissionId?: string;
  protocol?: number;
  code?: string;
  stage?: string;
  error?: string;
  comments?: PublishedComment[];
  comment?: PublishedComment;
  commentSession?: string;
};

export type PublishedComment = { id: string; firstName: string; text: string; createdAt: string };

export function writerRejection(result: ScriptResult) {
  switch (result.code) {
    case "WRITER_NOT_FOUND": return "not-found";
    case "WRITER_INACTIVE": return "inactive";
    case "SUBMISSION_LIMIT": return "limit-reached";
  }
  if (result.error === "That BCWO ID and verification email could not be found in our database.") return "not-found";
  if (result.error === "Maximum submission limit reached.") return "limit-reached";
}

export async function callSubmissionScript(endpoint: string, data: object, timeout: number): Promise<ScriptResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Apps Script HTTP " + response.status);
  const result = await response.json();
  if (!result || typeof result.success !== "boolean") throw new Error("Unrecognized Apps Script response");
  return result;
}

export async function verifyWriter(request: Request): Promise<VerificationStatus> {
  const data = await request.json().catch(() => null);
  const bcwoId = typeof data?.bcwoId === "string" ? data.bcwoId.trim() : "";
  const verificationEmail = typeof data?.verificationEmail === "string" ? data.verificationEmail.trim() : "";
  if (!bcwoId || !EMAIL_PATTERN.test(verificationEmail)) return "incomplete";
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return "unavailable";
  try {
    const result = await callSubmissionScript(endpoint, { action: "verify", bcwoId, verificationEmail }, 12_000);
    const rejection = writerRejection(result);
    if (rejection) return rejection;
    if (result.success && result.verified === true) return "verified";
    if (result.success && result.verified === false) return "not-found";
  } catch {
    // An unavailable register cannot establish a mismatch.
  }
  return "unavailable";
}
