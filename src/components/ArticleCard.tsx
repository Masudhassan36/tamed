"use client";

import Image from "next/image";
import Link from "next/link";
import type { ArticleCardData } from "@/lib/articles";
import RatingBadge from "@/components/RatingBadge";

type ArticleCardProps = {
  article: ArticleCardData;
};

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="article-card">
      <Link className="article-image image-frame" href={`/article/${article.slug}`} aria-label={`Read ${article.title}`}>
        <Image src={article.coverImage} alt={article.imageAlt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
      </Link>
      <p className="article-category">{article.fieldTitle}</p>
      <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
      <p className="article-author">{article.author ? `by ${article.author}` : "Byline not supplied"}</p>
      <p className="article-excerpt">{article.excerpt}</p>
      <RatingBadge rating={article.editorialRating} />
    </article>
  );
}