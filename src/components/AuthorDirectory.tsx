"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPublicationDate, type Article } from "@/lib/articles";

export default function AuthorDirectory({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const authors = useMemo(() => {
    const groups = new Map<string, Article[]>();
    for (const article of articles) if (article.author) groups.set(article.author, [...(groups.get(article.author) ?? []), article]);
    return [...groups.entries()].filter(([name]) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  }, [articles, query]);
  return <>
    <label className="author-search" htmlFor="author-search-input"><span>Search authors</span><input id="author-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
    <section className="institution-section author-list" aria-label="Published authors">
      {authors.map(([name, pieces]) => <article className="author-entry" key={name}>
        <div><p className="eyebrow">{pieces.length} {pieces.length === 1 ? "published piece" : "published pieces"}</p><h2>{name}</h2></div>
        <div className="author-works">{pieces.map((piece) => <Link className="author-work" href={`/article/${piece.slug}`} key={piece.slug}><span>{piece.title}</span><time dateTime={piece.publishedAt ?? undefined}>Issue {piece.issue} · {formatPublicationDate(piece.publishedAt) ?? "Published"}</time></Link>)}</div>
      </article>)}
    </section>
  </>;
}
