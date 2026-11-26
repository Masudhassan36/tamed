import type { Metadata } from "next";
import AuthorDirectory from "@/components/AuthorDirectory";
import { getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Authors",
  description: "Authors published by TAMED and their work in the journal.",
};

export default function AuthorsPage() {
  return (
    <main className="institution-page page-width contact-page">
      <header className="institution-header">
        <p className="eyebrow">The journal / Contributors</p>
        <h1>Authors</h1>
        <p>Writers rank by their average across rated published pieces. A plus adds half a point (3+ = 3.5, 4+ = 4.5, 5+ = 5.5). Ties go to the writer with more 5 ratings, then more 4+ ratings, then alphabetical order. Writers without ratings appear last.</p>
      </header>
      <AuthorDirectory articles={getPublishedArticles()} />
    </main>
  );
}
