import Image from "next/image";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import RatingBadge from "@/components/RatingBadge";
import TenCard from "@/components/TenCard";
import SectionTitle from "@/components/SectionTitle";
import LiveDate from "@/components/LiveDate";
import ArticleSearch from "@/components/ArticleSearch";
import { getAlwaysRecommendedArticles, getFeaturedArticles, getFieldTitle, getLatestIssue, getPublishedArticles, toArticleCardData } from "@/lib/articles";
import { theTen } from "@/lib/content";

export const dynamic = "force-dynamic";

function newestFirst(a: { publishedAt: string | null; id: string }, b: typeof a) {
  return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.id.localeCompare(a.id);
}

export default function Home() {
  const publishedArticles = getPublishedArticles();
  const latestIssue = getLatestIssue();
  const latestArticles = publishedArticles.filter((article) => article.issue === latestIssue).sort(newestFirst);
  const lead = latestArticles.find((article) => article.editorialRating === "5+")
    ?? latestArticles.find((article) => article.editorialRating === "5")
    ?? latestArticles[0];
  const topRated = publishedArticles.filter((article) => article.editorialRating === "5").sort(newestFirst);
  const honors = publishedArticles.filter((article) => article.editorialRating === "5+" && article.issue === latestIssue);
  const featuredArticles = getFeaturedArticles();
  const alwaysRecommended = getAlwaysRecommendedArticles();

  return (
    <main className="journal-home">
      <section className="issue-masthead" aria-labelledby="hero-title">
        <div className="page-width">
          <div className="issue-imprint">
            <span>Independent literary journal</span>
            <span>Issue {latestIssue} · <LiveDate /></span>
          </div>
          <h1 id="hero-title" className="issue-wordmark">
            <Image src="/images/tamed-wordmark.svg" alt="TAMED" width={692} height={144} priority />
          </h1>
          <div className="issue-masthead-footer">
            <p>For voices, ideas, and stories that refuse to remain silent.</p>
            <Link href="#latest">Browse Issue {latestIssue} <span aria-hidden="true">↓</span></Link>
          </div>
        </div>
      </section>

      {lead && (
        <section className="issue-lead page-width" aria-labelledby="issue-lead-title">
          <Link className="image-frame issue-lead-image" href={`/article/${lead.slug}`} aria-label={`Read ${lead.title}`}>
            <Image src={lead.coverImage} alt={lead.imageAlt} fill sizes="(max-width: 720px) 100vw, 54vw" />
          </Link>
          <div className="issue-lead-copy">
            <p className="eyebrow">From Issue {latestIssue} · {getFieldTitle(lead.field)}</p>
            <h2 id="issue-lead-title"><Link href={`/article/${lead.slug}`}>{lead.title}</Link></h2>
            {lead.author && <p className="issue-lead-byline">By {lead.author}</p>}
            <RatingBadge rating={lead.editorialRating} />
            <Link className="text-link" href={`/article/${lead.slug}`}>Read the piece <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      )}

      <section className="editorial-section page-width homepage-search-section">
        <ArticleSearch articles={publishedArticles.map(toArticleCardData)} />
      </section>

      <section className="editorial-section page-width" aria-labelledby="feature-heading">
        <SectionTitle eyebrow="01 / The journal" title="Featured" number="01" />
        <div id="feature-heading" className="article-grid">
          {featuredArticles.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
        </div>
      </section>

      {topRated.length > 0 && (
        <section className="editorial-section page-width top-rated-section" aria-label="Top Rated">
          <SectionTitle title="Top Rated" />
          <div className="article-grid top-rated-grid">
            {topRated.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} compact />)}
          </div>
        </section>
      )}

      {alwaysRecommended.length > 0 && (
        <section className="editorial-section page-width always-read-section" aria-labelledby="always-read-heading">
          <SectionTitle eyebrow="A standing recommendation" title="Always Read" />
          <div id="always-read-heading" className="article-grid">
            {alwaysRecommended.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
          </div>
        </section>
      )}

      <section className="editorial-section page-width" id="latest">
        <SectionTitle eyebrow="02 / Latest issue" title={`Issue ${latestIssue}`} number="02" />
        <div className="article-grid">
          {latestArticles.map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
        </div>
      </section>

      <section className="ten-section" id="the-ten">
        <div className="page-width">
          <SectionTitle eyebrow="03 / Editorial index" title="The Ten" description="The Ten are the ten editorial fields through which TAMED reads and publishes writing." number="03" />
          <div className="ten-list">
            {theTen.map((field) => <TenCard key={field.slug} field={field} />)}
          </div>
          <Link className="text-link ten-index-link" href="/the-ten">Explore The Ten <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="honors-section page-width">
        <SectionTitle eyebrow="04 / Editors' selection" title="TAMED Honors" description="Pieces recognized by the editors for exceptional craft, originality, and impact." number="04" />
        {honors.length > 0 ? (
          <div className="honors-list">
            {honors.map((article, index) => (
              <article className="honor-entry" key={article.slug}>
                <span className="honor-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="honor-copy">
                  <p className="article-category">{getFieldTitle(article.field)}</p>
                  <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
                  {article.author && <p>by {article.author}</p>}
                </div>
                <RatingBadge rating={article.editorialRating} />
              </article>
            ))}
          </div>
        ) : <p className="empty-archive">No works have been assigned an Editorial Rating of 5+ yet.</p>}
      </section>

      <section className="manifesto-section" id="manifesto">
        <div className="manifesto-inner page-width">
          <p className="eyebrow">05 / A note on voice</p>
          <div className="manifesto-copy">
            <h2>We believe a writer does not need permission to think.</h2>
            <p>We believe words can be beautiful, uncomfortable, strange, painful, humorous, or impossible.</p>
            <p>We believe writing should remain human.</p>
          </div>
          <div className="manifesto-principles">
            <p>TAMED exists for writing that refuses to remain silent.</p>
            <p>Identity should never determine the value of a voice.</p>
            <p>Writers may publish under their real name, a pen name, or anonymously.</p>
          </div>
        </div>
      </section>

      <section className="closing-note page-width">
        <p className="eyebrow">An invitation</p>
        <p className="closing-line">There is a place for your voice here.</p>
        <Link className="text-link" href="/submit">Submit your work <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
