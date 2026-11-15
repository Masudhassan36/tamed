"use client";

import { useEffect, useId, useState } from "react";
import { CheckIcon, CrossIcon } from "@/components/Icons";
import { EMAIL_PATTERN, writerMessages, type VerificationStatus } from "@/lib/submission-upload";

type DisplayStatus = "idle" | "checking" | VerificationStatus;
const SETTLE_MS = 300;

function StatusMessage({ status }: { status: DisplayStatus }) {
  if (status === "checking") return <span className="verify-text">Checking the BCWO register…</span>;
  if (status === "incomplete") return <span className="verify-text">Enter your ID and a complete registration email to check eligibility.</span>;
  if (status === "verified") return (
    <>
      <CheckIcon className="verify-icon" />
      <span className="verify-text">BCWO registration verified.</span>
    </>
  );
  if (status === "not-found" || status === "inactive" || status === "limit-reached") return (
    <>
      <CrossIcon className="verify-icon" />
      <span className="verify-text">{writerMessages[status]}</span>
    </>
  );
  if (status === "unavailable") return (
    <span className="verify-text">TAMED could not reach the BCWO register. Try checking again.</span>
  );
  return null;
}

export default function WriterVerification() {
  const [bcwoId, setBcwoId] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [status, setStatus] = useState<DisplayStatus>("idle");
  const [retry, setRetry] = useState(0);
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
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        });
        if (!response.ok) throw new Error("Verification request failed");
        const result = await response.json() as { status?: string };
        if (controller.signal.aborted) return;
        switch (result.status) {
          case "verified":
          case "not-found":
          case "inactive":
          case "limit-reached":
          case "incomplete":
            setStatus(result.status);
            break;
          default:
            setStatus("unavailable");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("unavailable");
      }
    }, SETTLE_MS);

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [bcwoId, verificationEmail, retry]);

  return (
    <>
      <label>
        BCWO Registration ID / Team ID
        <input
          name="bcwoId"
          required
          maxLength={120}
          autoComplete="off"
          value={bcwoId}
          onChange={(event) => {
            setBcwoId(event.target.value);
            resetStatus(event.target.value, verificationEmail);
          }}
          placeholder="Enter your BCWO Registration ID or Team ID"
          aria-describedby={statusId}
        />
      </label>
      <label>
        Verification Email
        <input
          type="email"
          name="verificationEmail"
          required
          maxLength={254}
          autoComplete="email"
          value={verificationEmail}
          onChange={(event) => {
            setVerificationEmail(event.target.value);
            resetStatus(bcwoId, event.target.value);
          }}
          placeholder="Email used for BCWO registration"
          aria-describedby={statusId}
        />
      </label>
      <p className={`verify-status full-field verify-status--${status}`} id={statusId} role="status" aria-live="polite">
        <StatusMessage status={status} />
      </p>
      {status === "unavailable" && (
        <div className="full-field">
          <button className="button" type="button" onClick={() => { setStatus("checking"); setRetry(retry + 1); }}>
            Check registration again
          </button>
        </div>
      )}
    </>
  );
}
