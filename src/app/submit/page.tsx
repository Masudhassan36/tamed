"use client";

import { startTransition, useActionState, useState } from "react";
import CategorySelect from "@/components/CategorySelect";
import WriterVerification from "@/components/WriterVerification";
import { submitWork, type SubmitFormState } from "./actions";

const initialState: SubmitFormState = {};

const LANGUAGES = ["English", "Bengali"] as const;

function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SubmitPage() {
  const [state, formAction, pending] = useActionState(submitWork, initialState);
  const [uploadError, setUploadError] = useState("");

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
    setUploadError("");
    const form = event.currentTarget;
    const manuscript = form.elements.namedItem("manuscript") as HTMLInputElement;
    const coverImage = form.elements.namedItem("coverImage") as HTMLInputElement;
    const manuscriptFile = manuscript.files?.[0];
    if (!manuscriptFile) { setUploadError("Please attach your manuscript before submitting."); return; }
    const coverFile = coverImage.files?.[0];
    if (!coverFile) { setUploadError("A cover image is required. Please attach one before submitting."); return; }
    if (!coverFile.type.startsWith("image/")) { setUploadError("Your cover image must be an image file."); return; }
    try {
      const submittedData = new FormData(form);
      submittedData.delete("manuscript");
      submittedData.delete("coverImage");
      submittedData.append("manuscript", JSON.stringify({ name: manuscriptFile.name, type: manuscriptFile.type, data: await fileData(manuscriptFile) }));
      submittedData.append("manuscriptName", manuscriptFile.name);
      submittedData.append("manuscriptType", manuscriptFile.type);
      submittedData.append("manuscriptSize", String(manuscriptFile.size));
      submittedData.append("manuscriptLastModified", String(manuscriptFile.lastModified));
      submittedData.append("coverImage", JSON.stringify({ name: coverFile.name, type: coverFile.type, data: await fileData(coverFile) }));
      submittedData.append("coverImageName", coverFile.name);
      submittedData.append("coverImageType", coverFile.type);
      submittedData.append("coverImageSize", String(coverFile.size));
      submittedData.append("coverImageLastModified", String(coverFile.lastModified));
      startTransition(() => formAction(submittedData));
    } catch {
      setUploadError("Your files could not be uploaded. Please try again.");
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

      <form className="submission-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>00 / Eligibility</legend>
          <div className="form-grid">
            <WriterVerification />
          </div>
          <p className="section-note">TAMED is open to writers registered with the Bangladesh Creative Writing Olympiad.</p>
        </fieldset>

        <fieldset>
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

        <fieldset>
          <legend>02 / Publication</legend>
          <div className="choice-row">
            <label><input type="radio" name="publishPreference" value="real-name" required /> Real name</label>
            <label><input type="radio" name="publishPreference" value="pen-name" /> Pen name</label>
            <label><input type="radio" name="publishPreference" value="anonymous" /> Anonymous</label>
          </div>
          <p className="section-note">How your name should appear if the work is published.</p>
        </fieldset>

        <fieldset>
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
            <label className="full-field">Cover Image Upload<input type="file" name="coverImage" accept="image/*" required /><span className="field-note">Required. The visual presentation is part of the reading experience — strong writing with weak visual presentation may be returned for revision before publication.</span></label>
          </div>
        </fieldset>

        <fieldset className="declaration-fieldset">
          <legend>04 / Declaration</legend>
          <div className="declaration-list">
            <label className="declaration-check"><input type="checkbox" name="originalWork" required /> <span>This is my original work.</span></label>
            <label className="declaration-check"><input type="checkbox" name="submissionPolicy" required /> <span>I understand plagiarism and highly AI-generated submissions are not accepted.</span></label>
            <label className="declaration-check"><input type="checkbox" name="contactConsent" required /> <span>I allow TAMED to contact me regarding publication, editorial feedback, and selected gifts.</span></label>
          </div>
          <p className="copyright-note">Copyright remains with the author. By submitting, you grant TAMED permission to publish the work if selected.</p>
        </fieldset>

        <div className="submit-actions">
          <button className="button button-dark submit-button" type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit work"} <span aria-hidden="true">↗</span>
          </button>
          {(state.error || uploadError) && <p className="form-status form-error" role="alert">{state.error || uploadError}</p>}
        </div>
      </form>
    </main>
  );
}
