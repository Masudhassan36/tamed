"use client";

import { useRef, useState } from "react";
import CategorySelect from "@/components/CategorySelect";
import WriterVerification from "@/components/WriterVerification";
import { MAX_ATTACHMENT_BYTES, uploadSizeMessage, type SubmissionResponse } from "@/lib/submission-upload";
import { attachmentMetadata, postUpload, uploadAttachment, validateCover, validateManuscript } from "./upload";

const LANGUAGES = ["English", "Bengali"] as const;

export default function SubmitPage() {
  const [state, setState] = useState<SubmissionResponse>({});
  const [progress, setProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const inFlight = useRef(false);
  const uploadId = useRef<string | undefined>(undefined);

  if (state.submissionId) {
    return (
      <main className="submit-page page-width">
        <section className="submission-success" role="status" aria-live="polite">
          <p className="eyebrow">Submission received</p>
          <h1>Thank you for submitting to TAMED™.</h1>
          <p>Your work has entered the editorial process.</p>
          <p className="submission-id-label">Submission ID</p>
          <p className="submission-id">{state.submissionId}</p>
          <p>Keep this reference. We will contact you only if necessary.</p>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setUploadError("");
    const data = new FormData(event.currentTarget);
    const manuscriptFile = data.get("manuscript");
    const coverFile = data.get("coverImage");
    if (!(manuscriptFile instanceof File) || !manuscriptFile.size) { setUploadError("Attach a nonempty manuscript."); return; }
    if (!(coverFile instanceof File) || !coverFile.size) { setUploadError("Attach a nonempty cover image."); return; }
    if (manuscriptFile.size + coverFile.size > MAX_ATTACHMENT_BYTES) { setUploadError(uploadSizeMessage); return; }
    inFlight.current = true;
    setProgress("Checking attachments…");
    try {
      const cover = attachmentMetadata(coverFile);
      await validateManuscript(manuscriptFile);
      await validateCover(coverFile, cover.type);
      uploadId.current ??= crypto.randomUUID();
      data.set("uploadId", uploadId.current);
      data.set("action", "beginUpload");
      data.set("manuscript", JSON.stringify(attachmentMetadata(manuscriptFile)));
      data.set("coverImage", JSON.stringify(cover));
      const session = new FormData();
      for (const key of ["uploadId", "bcwoId", "verificationEmail"]) session.set(key, data.get(key)!);
      setProgress("Checking your BCWO registration…");
      const started = await postUpload(data);
      const receipt = started.submissionId
        ?? await uploadAttachment(session, "manuscript", manuscriptFile, setProgress)
        ?? await uploadAttachment(session, "coverImage", coverFile, setProgress);
      if (receipt) {
        setState({ submissionId: receipt });
        return;
      }
      setProgress("Saving your submission and requesting a receipt…");
      session.set("action", "finishUpload");
      setState(await postUpload(session));
    } catch (error) {
      setUploadError(error instanceof Error && !(error instanceof TypeError) && !(error instanceof DOMException)
        ? error.message
        : "The connection was interrupted. Click Submit work again with the same details to resume or check for a receipt.");
    } finally {
      setProgress("");
      inFlight.current = false;
    }
  }

  return (
    <main className="submit-page page-width">
      <header className="submit-header">
        <p className="eyebrow">For writers</p>
        <h1>Submit Your Work</h1>
        <p>We welcome writing that is attentive, original, and unafraid of its own voice.</p>
        <p className="privacy-note">Contact and delivery details are for the TAMED editorial team only and never appear in articles, the public archive, or author profiles. Anonymous publication conceals your identity from readers.</p>
      </header>

      <form className="submission-form" onSubmit={handleSubmit} onChange={() => { uploadId.current = undefined; }}>
        <fieldset disabled={Boolean(progress)}>
          <legend>00 / Eligibility</legend>
          <div className="form-grid">
            <WriterVerification />
          </div>
          <p className="section-note">TAMED is open to writers registered with the Bangladesh Creative Writing Olympiad.</p>
        </fieldset>

        <fieldset disabled={Boolean(progress)}>
          <legend>01 / The writer</legend>
          <div className="form-grid">
            <label>Full Name <span>optional</span><input name="writerName" autoComplete="name" /></label>
            <label>Pen Name <span>optional</span><input name="penName" autoComplete="nickname" /></label>
            <label>Email Address<input type="email" name="email" autoComplete="email" required /></label>
            <label>Phone Number <span>optional</span><input type="tel" name="phone" autoComplete="tel" placeholder="Include country code" /></label>
            <label className="full-field">Full Delivery Address <span>optional</span><textarea name="deliveryAddress" autoComplete="street-address" rows={3} /></label>
            <p className="field-note full-field">Phone and delivery address are needed only for important correspondence or for writers selected to receive a physical gift.</p>
          </div>
        </fieldset>

        <fieldset disabled={Boolean(progress)}>
          <legend>02 / Publication</legend>
          <div className="choice-row">
            <label><input type="radio" name="publishPreference" value="real-name" required /> Real name</label>
            <label><input type="radio" name="publishPreference" value="pen-name" /> Pen name</label>
            <label><input type="radio" name="publishPreference" value="anonymous" /> Anonymous</label>
          </div>
          <p className="section-note">How your name should appear if the work is published.</p>
        </fieldset>

        <fieldset disabled={Boolean(progress)}>
          <legend>03 / The work</legend>
          <div className="form-grid">
            <label className="full-field">Title<input name="title" required /></label>
            <label>Language
              <select name="language" required defaultValue="">
                <option value="" disabled>Select a language</option>
                {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
              </select>
            </label>
            <CategorySelect />
            <label className="full-field">Manuscript Upload<input type="file" name="manuscript" accept=".doc,.docx,.pdf,.txt" required /><span className="field-note">DOC, DOCX, PDF, or TXT.</span></label>
            <label className="full-field">Cover Image Upload<input type="file" name="coverImage" accept="image/*" required /><span className="field-note">Required. TAMED keeps the original image quality. The manuscript and cover can total up to 20 MB.</span></label>
          </div>
        </fieldset>

        <fieldset className="declaration-fieldset" disabled={Boolean(progress)}>
          <legend>04 / Declaration</legend>
          <div className="declaration-list">
            <label className="declaration-check"><input type="checkbox" name="originalWork" required /> <span>This is my original work.</span></label>
            <label className="declaration-check"><input type="checkbox" name="submissionPolicy" required /> <span>I understand plagiarism and highly AI-generated submissions are not accepted.</span></label>
            <label className="declaration-check"><input type="checkbox" name="contactConsent" required /> <span>I allow TAMED to contact me regarding publication, editorial feedback, and selected gifts.</span></label>
          </div>
          <p className="copyright-note">Copyright remains with the author. By submitting, you grant TAMED permission to publish the work if selected.</p>
        </fieldset>

        <div className="submit-actions">
          <button className="button button-dark submit-button" type="submit" disabled={Boolean(progress)}>
            {progress ? "Submitting…" : "Submit work"} <span aria-hidden="true">↗</span>
          </button>
          <p className="form-status" role="status">{progress}</p>
          {uploadError && <p className="form-status form-error" role="alert">{uploadError}</p>}
        </div>
      </form>
    </main>
  );
}
