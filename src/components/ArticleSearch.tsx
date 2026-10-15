"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { ArticleCardData } from "@/lib/articles";

export default function ArticleSearch({ articles }: { articles: ArticleCardData[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return articles.filter((article) => !needle || `${article.title} ${article.author ?? ""}`.toLocaleLowerCase().includes(needle));
  }, [articles, query]);
  return (
    <div className="homepage-search">
      <label htmlFor="homepage-search-input">Search the journal</label>
      <input id="homepage-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or author" />
      {query && <div className="article-grid search-results">{visible.map((article) => <ArticleCard key={article.slug} article={article} />)}</div>}
      {query && !visible.length && <p className="empty-field">No published writing matches that search.</p>}
    </div>
  );
}
