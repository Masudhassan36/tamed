"use client";

import Link from "next/link";

export default function PageError({ retry }: { retry: () => void }) {
  return (
    <main className="page-width">
      <section className="submission-success" role="alert">
        <h1>We couldn’t load this page</h1>
        <p>Try again in a moment. If the problem continues, contact the editors.</p>
        <button className="button button-dark" type="button" onClick={retry}>Try again</button>{" "}
        <Link className="button" href="/contact">Contact the editors</Link>
      </section>
    </main>
  );
}
