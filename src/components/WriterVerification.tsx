"use client";

import { useEffect, useId, useState } from "react";
import { CheckIcon, CrossIcon } from "@/components/Icons";

type VerificationStatus = "idle" | "incomplete" | "checking" | "verified" | "not-found" | "unavailable";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SETTLE_MS = 600;

function StatusMessage({ status }: { status: VerificationStatus }) {
  if (status === "checking") return <span className="verify-text">Checking the register…</span>;
  if (status === "verified") return (
    <>
      <CheckIcon className="verify-icon" />
      <span className="verify-text">Verified — your BCWO registration was found.</span>
    </>
  );
  if (status === "not-found") return (
    <>
      <CrossIcon className="verify-icon" />
      <span className="verify-text">Not found. Check your BCWO Registration ID and the email you registered with.</span>
    </>
  );
  if (status === "unavailable") return (
    <span className="verify-text">The register could not be reached just now. Submit anyway — the editors confirm on receipt.</span>
  );
  return null;
}

/**
 * The two BCWO fields, checked against the register as the writer types. The
 * answer is only ever "found" or "not found"; the submission itself is
 * validated again on the server, so this is guidance, not a gate.
 */
export default function WriterVerification() {
  const [bcwoId, setBcwoId] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const statusId = useId();

  function resetStatus(id: string, email: string) {
    setStatus(!id.trim() && !email.trim() ? "idle"
      : !id.trim() || !EMAIL_PATTERN.test(email.trim()) ? "incomplete" : "checking");
  }

  useEffect(() => {
    const id = bcwoId.trim();
    const email = verificationEmail.trim();
    if (!id || !EMAIL_PATTERN.test(email)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/verify-writer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bcwoId: id, verificationEmail: email }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Verification request failed");
        const result = await response.json() as { status?: string };
        if (controller.signal.aborted) return;
        if (result.status === "verified") setStatus("verified");
        else if (result.status === "unavailable") setStatus("unavailable");
        else setStatus("not-found");
      } catch (error) {
        if (!controller.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) setStatus("unavailable");
      }
    }, SETTLE_MS);

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [bcwoId, verificationEmail]);

  const message = <StatusMessage status={status} />;

  return (
    <>
      <label>
        BCWO Registration ID / Team ID
        <input
          name="bcwoId"
          required
          autoComplete="off"
          value={bcwoId}
          onChange={(event) => {
            setBcwoId(event.target.value);
            resetStatus(event.target.value, verificationEmail);
          }}
          placeholder="Enter your BCWO Registration ID or Team ID"
          aria-describedby={message ? statusId : undefined}
        />
      </label>
      <label>
        Verification Email
        <input
          type="email"
          name="verificationEmail"
          required
          autoComplete="email"
          value={verificationEmail}
          onChange={(event) => {
            setVerificationEmail(event.target.value);
            resetStatus(bcwoId, event.target.value);
          }}
          placeholder="Email used for BCWO registration"
          aria-describedby={message ? statusId : undefined}
        />
      </label>
      <p className={`verify-status full-field verify-status--${status}`} id={statusId} role="status" aria-live="polite">
        {message}
      </p>
    </>
  );
}
