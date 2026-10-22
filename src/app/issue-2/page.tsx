import type { Metadata } from "next";
import ArticleCard from "@/components/ArticleCard";
import SectionTitle from "@/components/SectionTitle";
import { getPublishedArticles, toArticleCardData } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Issue 2",
  description: "Read the complete Issue 2 collection from TAMED™.",
};

export default function IssueTwoPage() {
  const articles = getPublishedArticles().filter((article) => article.issue === 2);

  return (
    <main className="archive-page page-width">
      <header className="institution-header">
        <p className="eyebrow">The journal / October 21, 2026</p>
        <h1>Issue 2</h1>
        <p>{articles.length} works, each published in full.</p>
      </header>
      <section className="archive-section archive-all">
        <SectionTitle eyebrow="Issue 2" title="Published Works" description="Read each piece on TAMED™." />
        <div className="article-grid">
          {articles.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
        </div>
      </section>
    </main>
  );
}
