"use server";

import { theTen, type EditorialFieldSlug } from "@/lib/content";

import { createSubmission } from "@/lib/submissions";
import type { NewSubmission, PublishPreference, SubmissionFile } from "@/types/submission";

export interface SubmitFormState { submissionId?: string; error?: string; }
const preferences = new Set<PublishPreference>(["real-name", "pen-name", "anonymous"]);
const fields = new Set(theTen.map((field) => field.slug));
function text(data: FormData, name: string): string { const value = data.get(name); return typeof value === "string" ? value.trim() : ""; }

export async function submitWork(_previous: SubmitFormState, data: FormData): Promise<SubmitFormState> {
  const bcwoId = text(data, "bcwoId"), verificationEmail = text(data, "verificationEmail");
  const email = text(data, "email"), title = text(data, "title"), language = text(data, "language");
  const writerName = text(data, "writerName"), penName = text(data, "penName"), preference = text(data, "publishPreference") as PublishPreference, field = text(data, "field") as EditorialFieldSlug;
  const manuscriptData = text(data, "manuscript");
  const coverData = text(data, "coverImage");
  if (!bcwoId || !verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) return { error: "Please provide your BCWO Registration ID or Team ID and a valid verification email." };
  if (!email || !email.includes("@") || !title || !language) return { error: "Please complete all required fields with valid information." };
  if (!preferences.has(preference) || !fields.has(field)) return { error: "Please select a valid publication preference and editorial field." };
  if (preference !== "pen-name" && !writerName) return { error: "Please provide your full name for editorial records." };
  if (preference === "pen-name" && !penName) return { error: "Please provide your pen name or choose another publication preference." };
  let manuscriptFile: { name: string; type: string; data: string }; let coverFile: { name: string; type: string; data: string } | null = null;
  try { manuscriptFile = JSON.parse(manuscriptData); if (coverData) coverFile = JSON.parse(coverData); } catch { return { error: "Please attach valid files." }; }
  if (!manuscriptFile?.data || !manuscriptFile.name || ![".doc", ".docx", ".pdf", ".txt"].some((ext) => manuscriptFile.name.toLowerCase().endsWith(ext))) return { error: "Please attach a DOC, DOCX, PDF, or TXT manuscript." };
  if (data.get("originalWork") !== "on" || data.get("submissionPolicy") !== "on" || data.get("contactConsent") !== "on") return { error: "Please accept all declarations before submitting." };

  const manuscript: SubmissionFile = { name: manuscriptFile.name, type: manuscriptFile.type, size: 0, lastModified: 0, url: "" };
  const coverImage: SubmissionFile | null = coverFile ? { name: coverFile.name, type: coverFile.type, size: 0, lastModified: 0, url: "" } : null;
  const input: NewSubmission = { bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, field, title, language, manuscript, coverImage };
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return { error: "Submission service is not configured. Add GOOGLE_SCRIPT_URL to the deployed app environment." };
  const submission = await createSubmission(input);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: submission.id, submittedAt: submission.submittedAt, bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, field, title, language, manuscript: manuscriptFile, coverImage: coverFile, status: submission.status }) });
    const result = await response.json() as { success?: boolean; submissionId?: string; stage?: string; error?: string };
    if (!response.ok || result.success !== true) {
      if (/bcwo|verification|registration|season|inactive|authorized writer|account/i.test(result.error || "")) {
        return { error: "That BCWO ID and verification email could not be found in our database. Please check both and try again." };
      }
      const detail = [result.stage, result.error].filter(Boolean).join(": ");
      return { error: detail ? `Apps Script error (${detail}). Please try again.` : "Your submission could not be completed. Please try again." };
    }
    return { submissionId: result.submissionId || submission.id };
  } catch { return { error: "Your submission could not be completed. Please try again." }; }
}
