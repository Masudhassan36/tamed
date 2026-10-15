"use client";

import { startTransition, useActionState, useState } from "react";
import CategoryPicker from "@/components/CategoryPicker";
import { submitWork, type SubmitFormState } from "./actions";

function fileData(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }

const initialState: SubmitFormState = {};

export default function SubmitPage() {
  const [state, formAction, pending] = useActionState(submitWork, initialState);
  const [uploadError, setUploadError] = useState("");
  const [verification, setVerification] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  async function checkVerification(form: HTMLFormElement) {
    const bcwoId = (form.elements.namedItem("bcwoId") as HTMLInputElement).value.trim();
    const verificationEmail = (form.elements.namedItem("verificationEmail") as HTMLInputElement).value.trim();
    if (!bcwoId || !verificationEmail || !verificationEmail.includes("@")) { setVerification("idle"); return; }
    setVerification("checking");
    try {
      const response = await fetch("/api/verify-bcwo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bcwoId, verificationEmail }) });
      const result = await response.json() as { verified?: boolean };
      setVerification(result.verified ? "valid" : "invalid");
    } catch { setVerification("invalid"); }
  }

  if (state.submissionId) {
    return <main className="submit-page page-width"><section className="submission-success" role="status" aria-live="polite"><p className="eyebrow">Submission received</p><h1>Thank you for submitting to TAMED™.</h1><p>Your submission has been received.</p><p>Your work has entered the editorial process.</p><p className="submission-id-label">Submission ID:</p><p className="submission-id">{state.submissionId}</p><p>We will contact you only if necessary.</p></section></main>;
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
        <p className="eyebrow">For writers</p><h1>Submit Your Work</h1>
        <p>We welcome writing that is attentive, original, and unafraid of its own voice.</p>
        <p className="privacy-note">Contact and delivery details are for the TAMED editorial team only and never appear in articles, the public archive, or author profiles. Anonymous publication conceals your identity from readers.</p>
      </header>
      <form className="submission-form" onSubmit={handleSubmit}>
        <fieldset><legend>00 / BCWO Verification</legend><div className="form-grid">
          <label>BCWO Registration ID / Team ID<input name="bcwoId" required placeholder="Enter your BCWO Registration ID or Team ID" onBlur={(event) => checkVerification(event.currentTarget.form!)} /></label>
          <label>Verification Email<div className="verification-input"><input name="verificationEmail" type="email" required placeholder="Email used for BCWO registration" onBlur={(event) => checkVerification(event.currentTarget.form!)} /><span className={`verification-mark verification-mark--${verification}`} aria-live="polite" aria-label={verification === "valid" ? "Verification matched" : verification === "invalid" ? "Verification did not match" : undefined}>{verification === "valid" ? "✓" : verification === "invalid" ? "×" : verification === "checking" ? "…" : ""}</span></div></label>
        </div><p className="privacy-note">Your BCWO registration details are used only for eligibility verification and are visible only to the TAMED editorial team.</p></fieldset>
        <fieldset><legend>01 / Writer Information</legend><div className="form-grid">
          <label>Full Name <span>(optional)</span><input name="writerName" autoComplete="name" /></label><label>Pen Name<input name="penName" autoComplete="nickname" /></label>
          <label>Email Address<input type="email" name="email" autoComplete="email" required /></label><label>Phone Number <span>(optional)</span><input type="tel" name="phone" autoComplete="tel" placeholder="Include country code" /><span className="field-note">Optional. Used only for important communication or selected physical gifts.</span></label>
          <label className="full-field">Full Delivery Address <span>(optional)</span><textarea name="deliveryAddress" autoComplete="street-address" rows={3} /><span className="field-note">Optional during submission. Required only for selected writers receiving physical gifts.</span></label>
        </div></fieldset>
        <fieldset><legend>02 / Publish Preference</legend><div className="choice-row"><label><input type="radio" name="publishPreference" value="real-name" required /> Real name</label><label><input type="radio" name="publishPreference" value="pen-name" /> Pen name</label><label><input type="radio" name="publishPreference" value="anonymous" /> Anonymous</label></div></fieldset>
        <fieldset><legend>03 / Writing Information</legend><div className="form-grid">
          <label>Title<input name="title" required /></label><label>Language<select name="language" defaultValue="" required><option value="" disabled>Select language</option><option value="English">English</option><option value="Bengali">Bengali</option></select></label>
          <CategoryPicker />
          <label className="full-field">Manuscript Upload<input type="file" name="manuscript" accept=".doc,.docx,.pdf,.txt" required /><span className="field-note">DOC, DOCX, PDF, or TXT</span></label><label className="full-field">Cover Image Upload<input type="file" name="coverImage" accept="image/*" required /><span className="field-note">Required. The visual presentation is part of the reading experience — strong writing with weak visual presentation may be returned for revision before publication.</span></label>
        </div></fieldset>
        <fieldset className="declaration-fieldset"><legend>04 / Declaration</legend><div className="declaration-list"><label className="declaration-check"><input type="checkbox" name="originalWork" required /> <span>This is my original work.</span></label><label className="declaration-check"><input type="checkbox" name="submissionPolicy" required /> <span>I understand plagiarism and highly AI-generated submissions are not accepted.</span></label><label className="declaration-check"><input type="checkbox" name="contactConsent" required /> <span>I allow TAMED to contact me regarding publication, editorial feedback, and selected gifts.</span></label></div><p className="copyright-note">Copyright remains with the author. By submitting, you grant TAMED permission to publish the work if selected.</p></fieldset>
        <button className="button button-dark submit-button" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit work"} <span aria-hidden="true">↗</span></button>{(state.error || uploadError) && <p className="form-status form-error" role="alert">{state.error || uploadError}</p>}
      </form>
    </main>
  );
}
