"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPublicationDate, type Article, type EditorialRating } from "@/lib/articles";

const ratingPoints: Record<EditorialRating, number> = {
  "2": 2, "2+": 2.5, "3": 3, "3+": 3.5,
  "4": 4, "4+": 4.5, "5": 5, "5+": 5.5,
};

export default function AuthorDirectory({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const authors = useMemo(() => {
    const groups = new Map<string, Article[]>();
    for (const article of articles) if (article.author) groups.set(article.author, [...(groups.get(article.author) ?? []), article]);
    const ranked = [...groups.entries()].map(([name, pieces]) => {
      const ratings = pieces.flatMap(({ editorialRating }) => editorialRating ? [editorialRating] : []);
      return {
        name,
        pieces,
        ratedCount: ratings.length,
        total: ratings.reduce((sum, rating) => sum + ratingPoints[rating], 0),
        fives: ratings.filter((rating) => rating === "5").length,
        fourPluses: ratings.filter((rating) => rating === "4+").length,
      };
    }).sort((a, b) =>
      Number(b.ratedCount > 0) - Number(a.ratedCount > 0) ||
      b.total * a.ratedCount - a.total * b.ratedCount ||
      b.fives - a.fives ||
      b.fourPluses - a.fourPluses ||
      a.name.localeCompare(b.name)
    );
    return ranked.map((author, index) => ({
      ...author,
      rank: author.ratedCount ? index + 1 : null,
      average: author.ratedCount ? (author.total / author.ratedCount).toFixed(2) : null,
    }));
  }, [articles]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleAuthors = authors.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedQuery));
  return <>
    <label className="author-search" htmlFor="author-search-input"><span>Search authors</span><input id="author-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
    <section className="institution-section author-list" aria-label="Published authors">
      {visibleAuthors.map(({ name, pieces, rank, average }) => <article className="author-entry" key={name}>
        <div>
          <p className="eyebrow">{rank !== null && `Rank ${rank} · `}{pieces.length} {pieces.length === 1 ? "published piece" : "published pieces"}</p>
          <h2>{name}</h2>
          <p>{average === null ? "No rated pieces yet" : `Average rating ${average}`}</p>
        </div>
        <div className="author-works">{pieces.map((piece) => <Link className="author-work" href={`/article/${piece.slug}`} key={piece.slug}><span>{piece.title}</span><time dateTime={piece.publishedAt ?? undefined}>Issue {piece.issue} · {formatPublicationDate(piece.publishedAt) ?? "Published"}</time></Link>)}</div>
      </article>)}
    </section>
  </>;
}
