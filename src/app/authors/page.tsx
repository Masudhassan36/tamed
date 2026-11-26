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
        <p>Writers rank by total points across rated published pieces. Each piece earns its numerical rating minus 2.5 points. A plus adds half a point, so 4+ is a rating of 4.5 and earns 2 points.</p>
        <p>Ties go to the higher average rating, then more 5 ratings, then more 4+ ratings, then alphabetical order. Writers without rated pieces appear last.</p>
      </header>
      <AuthorDirectory articles={getPublishedArticles()} />
    </main>
  );
}
