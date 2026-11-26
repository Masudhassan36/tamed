"use client";

import { useEffect, useState, type FormEvent } from "react";

type LikeState = { likes: number; liked: boolean };

export default function ArticleLike({ slug }: { slug: string }) {
  const [state, setState] = useState<LikeState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/likes?article=${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setState(await response.json());
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Likes are temporarily unavailable.");
      });
    return () => controller.abort();
  }, [slug]);

  async function toggle(credentials?: FormData) {
    if (!state || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article: slug, liked: !state.liked, ...Object.fromEntries(credentials ?? []) }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.verify) {
          setVerificationRequired(true);
          if (credentials) setError(data.error);
          return;
        }
        throw new Error();
      }
      setState(data);
      setVerificationRequired(false);
      window.dispatchEvent(new Event("tamed-reader-verified"));
    } catch {
      setError("Could not update your like. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void toggle(new FormData(event.currentTarget));
  }

  return (
    <div className="article-like">
      <button type="button" className="button button-light" aria-pressed={state?.liked ?? false}
        disabled={!state || pending || verificationRequired} onClick={() => void toggle()}>
        <span aria-hidden="true">{state?.liked ? "♥" : "♡"}</span>
        Like
      </button>
      {state && <span role="status">{state.likes} {state.likes === 1 ? "like" : "likes"}</span>}
      {verificationRequired && (
        <form className="article-comment-form article-like-verification" onSubmit={verify}>
          <p>Verify once to like and comment on this browser.</p>
          <label>BCWO registration ID <input name="bcwoId" required maxLength={120} /></label>
          <label>Registered email <input name="verificationEmail" type="email" required maxLength={254} /></label>
          <button type="submit" className="button button-dark" disabled={pending}>Verify and update like</button>
          <button type="button" onClick={() => { setVerificationRequired(false); setError(""); }}>Cancel</button>
        </form>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
