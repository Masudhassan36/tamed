import Image from "next/image";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import FeaturedArticle from "@/components/FeaturedArticle";
import RatingBadge from "@/components/RatingBadge";
import TenCard from "@/components/TenCard";
import SectionTitle from "@/components/SectionTitle";
import { getFeaturedArticle, getFieldTitle, getPublishedArticles, toArticleCardData } from "@/lib/articles";
import { theTen } from "@/lib/content";

export default function Home() {
  const publishedArticles = getPublishedArticles();
  const latestArticles = publishedArticles.slice(0, 3);
  const honors = publishedArticles.filter((article) => article.editorialRating === "5+");
  const featuredArticle = getFeaturedArticle();

  return (
    <main>
      <section className="hero page-width" aria-labelledby="hero-title">
        <div className="hero-topline"><span>Independent literary journal</span><span>Week 1 · Oct</span></div>
        <div className="hero-center">
          <p className="hero-kicker">Writing that refuses to remain silent</p>
          <h1 id="hero-title" className="hero-wordmark">
            <Image src="/images/tamed-wordmark.svg" alt="TAMED™" width={1200} height={280} priority />
          </h1>
          <p className="hero-subtitle">A literary journal for voices, ideas, and stories that refuse to remain silent.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="#latest">Read</Link>
            <Link className="button button-light" href="/submit">Submit Your Work <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="hero-bottomline"><span>Published by Bangladesh Creative Writing Olympiad</span><span>Read without permission</span></div>
      </section>

      <section className="editorial-section page-width" aria-labelledby="feature-heading">
        <SectionTitle eyebrow="01 / The journal" title="Today's Feature" number="01" />
        <div id="feature-heading">{featuredArticle && <FeaturedArticle article={featuredArticle} />}</div>
      </section>

      <section className="editorial-section page-width" id="latest">
        <SectionTitle eyebrow="02 / From the archive" title="Latest Pieces" description="New writing, selected by the editors." number="02" />
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