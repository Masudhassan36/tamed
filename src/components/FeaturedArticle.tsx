import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/articles";
import { getFieldTitle } from "@/lib/articles";
import RatingBadge from "@/components/RatingBadge";

type FeaturedArticleProps = {
  article: Article;
};

export default function FeaturedArticle({ article }: FeaturedArticleProps) {
  return (
    <article className="featured-article">
      <Link className="feature-image image-frame" href={`/article/${article.slug}`} aria-label={`Read ${article.title}`}>
        <Image src={article.coverImage} alt={article.imageAlt} fill priority sizes="(max-width: 900px) 100vw, 58vw" />
        <span className="image-caption">A work from the journal</span>
      </Link>
      <div className="feature-copy">
        <p className="eyebrow">{getFieldTitle(article.field)}</p>
        <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
        <p className="feature-excerpt">{article.excerpt}</p>
        <div className="feature-meta">
          {article.author && <span>By {article.author}</span>}
          <RatingBadge rating={article.editorialRating} />
        </div>
        <Link className="text-link" href={`/article/${article.slug}`}>Read the piece <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}