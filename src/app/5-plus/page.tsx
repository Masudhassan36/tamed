import type { Metadata } from "next";
import ArticleCollection from "@/components/ArticleCollection";
import SectionTitle from "@/components/SectionTitle";
import { getPublishedArticles, toArticleCardData } from "@/lib/articles";

export const metadata: Metadata = { title: "5+", description: "Every TAMED piece awarded an editorial rating of 5+." };

export default function FivePlusPage() {
  const pieces = getPublishedArticles().filter((article) => article.editorialRating === "5+");
  return <main className="field-page page-width">
    <header className="field-header"><p className="eyebrow">The journal / Honors</p><h1>5+</h1><p>Every piece awarded the journal’s highest editorial rating, across every issue.</p></header>
    <section className="field-latest"><SectionTitle eyebrow="All issues" title="5+ writing" /><ArticleCollection articles={pieces.map(toArticleCardData)} emptyMessage="No 5+ pieces have been published yet." /></section>
  </main>;
}
