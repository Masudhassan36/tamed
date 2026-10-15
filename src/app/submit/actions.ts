"use server";

import { editorialFieldSlugs, editorialSubsectionKeys, type EditorialFieldSlug } from "@/lib/content";
import { createSubmission } from "@/lib/submissions";
import type { NewSubmission, PublishPreference, SubmissionFile } from "@/types/submission";

export interface SubmitFormState { submissionId?: string; error?: string; }

const preferences = new Set<PublishPreference>(["real-name", "pen-name", "anonymous"]);
const knownFields = new Set<string>(editorialFieldSlugs);
const knownSubsections = new Set<string>(editorialSubsectionKeys);
const languages = new Set(["English", "Bengali"]);
const MANUSCRIPT_EXTENSIONS = [".doc", ".docx", ".pdf", ".txt"];

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Every selected field, deduplicated and kept in the published order of The Ten. */
function readCategories(data: FormData): EditorialFieldSlug[] {
  const selected = new Set(data.getAll("categories").map(String).filter((slug) => knownFields.has(slug)));
  return editorialFieldSlugs.filter((slug) => selected.has(slug));
}

/** Subsections are accepted only when their parent field is also selected. */
function readSubsections(data: FormData, categories: EditorialFieldSlug[]): string[] {
  const selectedFields = new Set<string>(categories);
  const selected = new Set(
    data.getAll("subcategories").map(String).filter((key) => {
      if (!knownSubsections.has(key)) return false;
      const parent = key.slice(0, key.indexOf(":"));
      return selectedFields.has(parent);
    })
  );
  return editorialSubsectionKeys.filter((key) => selected.has(key));
}

/**
 * The sheet keeps one cell for the field column, so categories are written as a
 * comma-separated list and a subsection is folded into its parent, e.g.
 * "fiction/sci-fi, poetry". Column order and payload keys are unchanged.
 */
function sheetFieldValue(categories: EditorialFieldSlug[], subcategories: string[]): string {
  return categories
    .map((slug) => {
      const prefix = `${slug}:`;
      const subsections = subcategories
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length));
      return subsections.length ? `${slug}/${subsections.join("+")}` : slug;
    })
    .join(", ");
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
  const subcategories = readSubsections(data, categories);

  if (!bcwoId || !verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) return { error: "Please provide your BCWO Registration ID or Team ID and a valid verification email." };
  if (!email || !email.includes("@") || !title || !languages.has(language)) return { error: "Please complete all required fields and choose English or Bengali." };
  if (!preferences.has(preference)) return { error: "Please select a valid publication preference." };
  if (categories.length > 2) return { error: "Please choose no more than two editorial fields." };
  if (!categories.length) return { error: "Please select at least one editorial field." };
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
  const input: NewSubmission = { bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, categories, subcategories, title, language, manuscript, coverImage };
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return { error: "Submission service is not configured. Add GOOGLE_SCRIPT_URL to the deployed app environment." };
  const submission = await createSubmission(input);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: submission.id, submittedAt: submission.submittedAt, bcwoId, verificationEmail, writerName, penName, email, phone: text(data, "phone"), deliveryAddress: text(data, "deliveryAddress"), publishPreference: preference, field: sheetFieldValue(categories, subcategories), categories, subcategories, title, language, manuscript: manuscriptFile, coverImage: coverFile, status: submission.status }) });
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
