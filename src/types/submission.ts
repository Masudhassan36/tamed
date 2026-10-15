import type { EditorialFieldSlug } from "@/lib/content";

export const SUBMISSION_STATUSES = ["received", "under-review", "revision-requested", "accepted", "rejected", "published"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type PublishPreference = "real-name" | "pen-name" | "anonymous";
export interface SubmissionFile { name: string; type: string; size: number; lastModified: number; url: string; }
/** Editorial-only record. Never pass it into public article or author data. */
export interface Submission {
  id: string;
  submittedAt: string;
  bcwoId: string;
  verificationEmail: string;
  writerName: string;
  penName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  publishPreference: PublishPreference;
  /** Every editorial field the writer selected, in the order shown on the form. */
  categories: EditorialFieldSlug[];
  /** Optional subsections, stored as "field-slug:subsection-slug". */
  subcategories: string[];
  title: string;
  language: string;
  manuscript: SubmissionFile;
  coverImage: SubmissionFile;
  status: SubmissionStatus;
  editorNotes: string[];
}
export type NewSubmission = Omit<Submission, "id" | "submittedAt" | "status" | "editorNotes">;
