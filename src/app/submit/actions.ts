"use server";

import { categorySlugs, type CategorySlug } from "@/lib/content";
import { createSubmission } from "@/lib/submissions";
import type { NewSubmission, PublishPreference, SubmissionFile } from "@/types/submission";

export interface SubmitFormState { submissionId?: string; error?: string; }

const preferences = new Set<PublishPreference>(["real-name", "pen-name", "anonymous"]);
const knownCategories = new Set<string>(categorySlugs);
const knownLanguages = new Set(["English", "Bengali"]);
const MANUSCRIPT_EXTENSIONS = [".doc", ".docx", ".pdf", ".txt"];

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Every selected category, deduplicated and kept in the published order. */
function readCategories(data: FormData): CategorySlug[] {
  const selected = new Set(data.getAll("categories").map(String).filter((slug) => knownCategories.has(slug)));
  return categorySlugs.filter((slug) => selected.has(slug));
}

function isManuscript(name: string): boolean {
  const lower = name.toLowerCase();
  return MANUSCRIPT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function submitWork(_previous: SubmitFormState, data: FormData): Promise<SubmitFormState> {
  const bcwoId = text(data, "bcwoId"), verificationEmail = text(data, "verificationEmail");
  const email = text(data, "email"), title = text(data, "title"), language = text(data, "language");
  const writerName = text(data, "writerName"), penName = text(data, "penName"), preference = text(data, "publishPreference") as PublishPreference;
  const manuscriptData = text(data, "manuscript");
  const coverData = text(data, "coverImage");
  const categories = readCategories(data);

  if (!bcwoId || !verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) return { error: "Please provide your BCWO Registration ID or Team ID and a valid verification email." };
  if (!email || !email.includes("@") || !title) return { error: "Please complete all required fields with valid information." };
  if (!knownLanguages.has(language)) return { error: "Please choose English or Bengali as the language of the work." };
  if (!preferences.has(preference)) return { error: "Please select a valid publication preference." };
  if (!categories.length) return { error: "Please choose at least one editorial category." };
  if (preference !== "pen-name" && !writerName) return { error: "Please provide your full name for editorial records." };
  if (preference === "pen-name" && !penName) return { error: "Please provide your pen name or choose another publication preference." };

  let manuscriptFile: { name: string; type: string; data: string };
  let coverFile: { name: string; type: string; data: string };
  try {
    manuscriptFile = JSON.parse(manuscriptData);
    coverFile = JSON.parse(coverData);
  } catch { return { error: "Please attach valid files." }; }
  if (!manuscriptFile?.data || !manuscriptFile.name || !isManuscript(manuscriptFile.name)) return { error: "Please attach a DOC, DOCX, PDF, or TXT manuscript." };
  if (!coverFile?.data || !coverFile.name) return { error: "A cover image is required. Please attach one before submitting." };
  if (!String(coverFile.type || "").startsWith("image/")) return { error: "Your cover image must be an image file." };
  if (data.get("originalWork") !== "on" || data.get("submissionPolicy") !== "on" || data.get("contactConsent") !== "on") return { error: "Please accept all declarations before submitting." };

  const manuscript: SubmissionFile = { name: manuscriptFile.name, type: manuscriptFile.type, size: 0, lastModified: 0, url: "" };
  const coverImage: SubmissionFile = { name: coverFile.name, type: coverFile.type, size: 0, lastModified: 0, url: "" };
  const input: NewSubmission = { bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, categories, title, language, manuscript, coverImage };
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return { error: "Submission service is not configured. Add GOOGLE_SCRIPT_URL to the deployed app environment." };
  const submission = await createSubmission(input);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: submission.id, submittedAt: submission.submittedAt, bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, field: categories.join(", "), categories, title, language, manuscript: manuscriptFile, coverImage: coverFile, status: submission.status }) });
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
