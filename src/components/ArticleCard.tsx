"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPublicationDate, type ArticleCardData } from "@/lib/articles";
import RatingBadge from "@/components/RatingBadge";

type ArticleCardProps = {
  article: ArticleCardData;
  compact?: boolean;
};

export default function ArticleCard({ article, compact = false }: ArticleCardProps) {
  return (
    <article className={compact ? "article-card article-card--compact" : "article-card"}>
      <Link className="article-image image-frame" href={`/article/${article.slug}`} aria-label={`Read ${article.title}`}>
        <Image src={article.coverImage} alt={article.imageAlt} fill sizes={compact ? "128px" : "(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"} />
      </Link>
      <div className="article-card-copy">
        <p className="article-category">{article.fieldTitle}</p>
        <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
        {!compact && article.firstLine && <p className="article-crux">{article.firstLine}</p>}
        <div className="article-card-meta">
          {article.author && <p className="article-author">by {article.author}</p>}
          {article.publishedAt && <time className="article-date" dateTime={article.publishedAt}>{formatPublicationDate(article.publishedAt)}</time>}
          <p className="article-issue">Issue {article.issue}</p>
        </div>
        <RatingBadge rating={article.editorialRating} />
      </div>
    </article>
  );
}
