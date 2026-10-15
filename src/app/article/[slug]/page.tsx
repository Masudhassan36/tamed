import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/ArticleBody";
import ArticleCard from "@/components/ArticleCard";
import RatingBadge from "@/components/RatingBadge";
import SectionTitle from "@/components/SectionTitle";
import { formatPublicationDate, getArticleBySlug, getArticlesByField, getFieldTitle, getPublishedArticles, toArticleCardData } from "@/lib/articles";

export function generateStaticParams() {
  return getPublishedArticles().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };

  const socialTitle = `${article.title} | TAMED™`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const coverUrl = siteUrl ? new URL(article.coverImage, siteUrl).toString() : undefined;
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: socialTitle,
      description: article.excerpt,
      siteName: "TAMED™",
      type: "article",
      images: coverUrl ? [{ url: coverUrl, alt: article.imageAlt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: article.excerpt,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getArticlesByField(article.field).filter((item) => item.slug !== article.slug).slice(0, 2);
  const relatedPieces = related.length ? related : getPublishedArticles().filter((item) => item.slug !== article.slug).slice(0, 2);
  const isRemoteCover = /^https?:/.test(article.coverImage);

  return (
    <main className="article-page page-width">
      <Link className="back-link" href="/">← Back to the journal</Link>
      <article className="article-reader">
        <header className="article-header">
          <p className="eyebrow">{getFieldTitle(article.field)}</p>
          <h1>{article.title}</h1>
          <div className="article-meta">
            {article.author && <span>By {article.author}</span>}
            {article.publishedAt && <time dateTime={article.publishedAt}>{formatPublicationDate(article.publishedAt)}</time>}
            <span>Issue {article.issue}</span>
            <RatingBadge rating={article.editorialRating} />
          </div>
        </header>
        <figure className="article-cover image-frame">
          <Image src={article.coverImage} alt={article.imageAlt} fill priority sizes="100vw" unoptimized={isRemoteCover} />
          <figcaption>From the TAMED journal</figcaption>
        </figure>
        <ArticleBody article={article} />
        {article.editorsNote && (
          <aside className="editors-note">
            <p className="eyebrow">Editor&apos;s Note</p>
            <p>{article.editorsNote}</p>
          </aside>
        )}
        {article.author && (
          <footer className="article-byline-bottom">
            <span>— {article.author}</span>
          </footer>
        )}
      </article>
      <section className="related-section">
        <SectionTitle eyebrow="Continue reading" title="Related Pieces" />
        <div className="article-grid">
          {relatedPieces.map((item) => <ArticleCard key={item.slug} article={toArticleCardData(item)} />)}
        </div>
      </section>
    </main>
  );
}
