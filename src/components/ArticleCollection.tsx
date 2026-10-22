"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { ArticleCardData } from "@/lib/articles";

type Props = { articles: ArticleCardData[]; emptyMessage?: string };

export default function ArticleCollection({ articles, emptyMessage = "No works match these filters." }: Props) {
  const [sort, setSort] = useState<"top" | "latest">("top");
  const [issue, setIssue] = useState("all");
  const issues = Array.from(new Set(articles.map((article) => article.issue))).sort((a, b) => b - a);
  const ratingRank = (rating: ArticleCardData["editorialRating"]) => rating ? { "5+": 8, "5": 7, "4+": 6, "4": 5, "3+": 4, "3": 3, "2+": 2, "2": 1 }[rating] : 0;
  const visible = useMemo(() => {
    return articles
      .filter((article) => issue === "all" || article.issue === Number(issue))
      .sort((a, b) => sort === "latest"
        ? String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""))
        : ratingRank(b.editorialRating) - ratingRank(a.editorialRating) || String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));
  }, [articles, issue, sort]);

  return (
    <div className="article-collection">
      <div className="collection-controls" aria-label="Filter writing">
        <label><span>Order</span><select value={sort} onChange={(event) => setSort(event.target.value as "top" | "latest")}><option value="top">Top rated</option><option value="latest">Latest</option></select></label>
        <label><span>Issue</span><select value={issue} onChange={(event) => setIssue(event.target.value)}><option value="all">All issues</option>{issues.map((value) => <option key={value} value={value}>Issue {value}</option>)}</select></label>
      </div>
      {visible.length ? <div className="article-grid">{visible.map((article) => <ArticleCard key={article.slug} article={article} />)}</div> : <p className="empty-field">{emptyMessage}</p>}
    </div>
  );
}
