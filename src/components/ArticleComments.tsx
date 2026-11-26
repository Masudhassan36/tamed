"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PublishedComment } from "@/lib/submission-service";

export default function ArticleComments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<PublishedComment[] | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [writing, setWriting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const remember = () => setRemembered(true);
    window.addEventListener("tamed-reader-verified", remember);
    return () => window.removeEventListener("tamed-reader-verified", remember);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/comments?article=${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setComments(data.comments);
        setRemembered(data.remembered);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("Comments are temporarily unavailable.");
      });
    return () => controller.abort();
  }, [slug]);

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    setPosting(true);
    setStatus("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, article: slug }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.verify) setRemembered(false);
        setStatus(data.error ?? "Could not post your comment.");
        return;
      }
      form.reset();
      setRemembered(true);
      setComments((existing) => [...(existing ?? []), data.comment]);
      setStatus("Comment published.");
    } catch {
      setStatus("Could not post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="article-comments" aria-labelledby="article-comments-title">
      <h2 id="article-comments-title">Comments</h2>
      {comments?.length ? (
        <ul className="article-comment-list">
          {comments.map((comment) => <li key={comment.id}>
            <strong>{comment.firstName}</strong>{" "}
            <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })}</time>
            <p>{comment.text}</p>
          </li>)}
        </ul>
      ) : comments && <p>No comments yet.</p>}
      {comments && (writing ? (
        <form className="article-comment-form" onSubmit={post}>
          {!remembered && <>
            <label>BCWO registration ID <input name="bcwoId" required maxLength={120} /></label>
            <label>Registered email <input name="verificationEmail" type="email" required maxLength={254} /></label>
            <p>Your first name will appear beside your comment.</p>
          </>}
          <label>Comment <textarea name="text" required maxLength={2000} rows={4} /></label>
          <button type="submit" className="button button-dark" disabled={posting}>{posting ? "Posting…" : "Post comment"}</button>
        </form>
      ) : <button type="button" className="button button-light" onClick={() => setWriting(true)}>Leave a comment</button>)}
      <p role="status">{status}</p>
    </section>
  );
}
