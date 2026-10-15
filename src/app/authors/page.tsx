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
        <p>Everyone published in TAMED, with their work gathered as the archive grows.</p>
      </header>
      <AuthorDirectory articles={getPublishedArticles()} />
    </main>
  );
}
