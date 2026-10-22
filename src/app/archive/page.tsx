import type { Metadata } from "next";
import ArticleCard from "@/components/ArticleCard";
import ArchiveBrowser from "@/components/ArchiveBrowser";
import SectionTitle from "@/components/SectionTitle";
import { getAvailableIssues, getPublishedArticles, toArticleCardData } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Archive",
  description: "Read the latest publications and selected works from TAMED™, an independent literary journal.",
};

export default function ArchivePage() {
  const articles = getPublishedArticles();
  const latest = articles.slice(0, 3);
  const honors = articles.filter((article) => article.editorialRating === "5+");
  const archiveArticles = articles.map(toArticleCardData);
  const issues = getAvailableIssues();

  return (
    <main className="archive-page page-width">
      <header className="institution-header">
        <p className="eyebrow">The journal / Index</p>
        <h1>Archive</h1>
        <p>A record of published work, kept in the order of its attention.</p>
      </header>
      <section className="archive-section">
        <SectionTitle eyebrow="01 / Recently published" title="Latest Publications" />
        <div className="article-grid">
          {latest.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
        </div>
      </section>
      <section className="archive-section">
        <SectionTitle eyebrow="02 / Issues" title="All Issues" description="Each Wednesday brings a new issue. Browse the issues currently in the journal." />
        <div className="issue-list">{issues.map((issue) => <a className="issue-row" href={issue === 2 ? "/issue-2" : `#issue-${issue}`} key={issue}><span>Issue {issue}</span><span>{articles.filter((article) => article.issue === issue).length} works</span></a>)}</div>
      </section>
      <section className="archive-section">
        <SectionTitle eyebrow="03 / Editors' selection" title="Editorial Rating 5+ Pieces" description="Exceptional work recognized for craft, originality, and impact." />
        <p className="rating-scale">5+ Exceptional · 5 Outstanding · 4+ Excellent · 4 Strong · 3+ Promising · 3 Developing · 2+ · 2</p>
        {honors.length > 0 ? (
          <div className="archive-honors">
            {honors.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
          </div>
        ) : <p className="empty-archive">No works have been assigned an Editorial Rating of 5+ yet.</p>}
      </section>
      <section className="archive-section archive-all">
        <SectionTitle eyebrow="04 / Published works" title="All Published Works" description="The full journal, across The Ten." />
        <ArchiveBrowser articles={archiveArticles} />
      </section>
    </main>
  );
}
