import { NextResponse } from "next/server";

type VerificationStatus = "verified" | "not-found" | "incomplete" | "unavailable" | "invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function respond(status: VerificationStatus, httpStatus = 200) {
  return NextResponse.json({ status }, { status: httpStatus });
}

/**
 * Confirms a BCWO registration against the same sheet the submission endpoint
 * writes to. Only ever answers "verified" or "not-found": no writer details
 * leave the sheet, and the Apps Script URL stays on the server.
 */
export async function POST(request: Request) {
  let payload: { bcwoId?: unknown; verificationEmail?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond("invalid", 400);
  }

  const bcwoId = typeof payload.bcwoId === "string" ? payload.bcwoId.trim() : "";
  const verificationEmail = typeof payload.verificationEmail === "string" ? payload.verificationEmail.trim() : "";
  if (!bcwoId || !EMAIL_PATTERN.test(verificationEmail)) return respond("incomplete");

  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return respond("unavailable", 503);

  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "verify");
    url.searchParams.set("bcwoId", bcwoId);
    url.searchParams.set("verificationEmail", verificationEmail);
    const response = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return respond("unavailable", 503);
    const result = await response.json() as { success?: boolean; verified?: boolean };
    if (result.success !== true) return respond("unavailable", 503);
    return respond(result.verified === true ? "verified" : "not-found");
  } catch {
    return respond("unavailable", 503);
  }
}
