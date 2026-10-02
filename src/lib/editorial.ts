import "server-only";
import { getSubmissionById, updateSubmission, updateSubmissionStatus } from "@/lib/submissions";
import type { Submission, SubmissionStatus } from "@/types/submission";
const editorAssignments = new Map<string, string>();
export async function assignEditor(submissionId: string, editorId: string): Promise<Submission | undefined> { const submission = await getSubmissionById(submissionId); if (!submission) return undefined; editorAssignments.set(submissionId, editorId); return submission; }
export async function addEditorNote(submissionId: string, note: string): Promise<Submission | undefined> { const cleanNote = note.trim(); if (!cleanNote) return getSubmissionById(submissionId); return updateSubmission(submissionId, (submission) => ({ ...submission, editorNotes: [...submission.editorNotes, cleanNote] })); }
export async function changeSubmissionStatus(submissionId: string, status: SubmissionStatus): Promise<Submission | undefined> { return updateSubmissionStatus(submissionId, status); }