"use client";

import { useEffect, useState } from "react";

type LikeState = { likes: number; liked: boolean };

export default function ArticleLike({ slug }: { slug: string }) {
  const [state, setState] = useState<LikeState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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

  async function toggle() {
    if (!state || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article: slug, liked: !state.liked }),
      });
      if (!response.ok) throw new Error();
      setState(await response.json());
    } catch {
      setError("Could not update your like. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="article-like">
      <button type="button" className="button button-light" aria-pressed={state?.liked ?? false}
        disabled={!state || pending} onClick={toggle}>
        <span aria-hidden="true">{state?.liked ? "♥" : "♡"}</span>
        Like
      </button>
      {state && <span role="status">{state.likes} {state.likes === 1 ? "like" : "likes"}</span>}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
