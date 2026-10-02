"use client";

import { useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { ArticleCardData } from "@/lib/articles";

type ArchiveArticle = ArticleCardData;

type ArchiveBrowserProps = {
  articles: ArchiveArticle[];
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function publicationParts(publishedAt: string | null) {
  if (!publishedAt) return null;

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publishedAt.trim());
  if (isoDate) {
    const month = Number(isoDate[2]) - 1;
    const day = Number(isoDate[3]);
    return { month, day, week: Math.ceil(day / 7), year: isoDate[1] };
  }

  const match = /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/.exec(publishedAt.trim());
  if (!match) return null;

  const month = monthNames.findIndex((name) => name.toLowerCase().startsWith(match[1].slice(0, 3).toLowerCase()));
  if (month < 0) return null;

  const day = Number(match[2]);
  return { month, day, week: Math.ceil(day / 7), year: match[3] ?? null };
}

export default function ArchiveBrowser({ articles }: ArchiveBrowserProps) {
  const [query, setQuery] = useState("");
  const [week, setWeek] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");

  const datedArticles = articles.map((article) => ({ article, date: publicationParts(article.publishedAt) }));
  const availableMonths = Array.from(new Set(datedArticles.flatMap(({ date }) => date ? [date.month] : []))).sort((a, b) => a - b);
  const availableWeeks = Array.from(new Set(datedArticles.flatMap(({ date }) => date ? [date.week] : []))).sort((a, b) => a - b);
  const availableYears = Array.from(new Set(datedArticles.flatMap(({ date }) => date?.year ? [date.year] : []))).sort((a, b) => Number(b) - Number(a));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredArticles = datedArticles.filter(({ article, date }) => {
    const matchesQuery = !normalizedQuery || `${article.title} ${article.author ?? ""}`.toLocaleLowerCase().includes(normalizedQuery);
    const matchesWeek = week === "all" || date?.week === Number(week);
    const matchesMonth = month === "all" || date?.month === Number(month);
    const matchesYear = year === "all" || (year === "unknown" ? !date?.year : date?.year === year);
    return matchesQuery && matchesWeek && matchesMonth && matchesYear;
  });
  const hasFilters = Boolean(normalizedQuery) || week !== "all" || month !== "all" || year !== "all";

  return (
    <div className="archive-browser">
      <div className="archive-controls" role="search" aria-label="Search and filter published works">
        <label className="archive-search" htmlFor="archive-query">
          <span>Search by title or author</span>
          <input
            id="archive-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the archive"
          />
        </label>
        <label htmlFor="archive-week">
          <span>Week</span>
          <select id="archive-week" value={week} onChange={(event) => setWeek(event.target.value)}>
            <option value="all">All weeks</option>
            {availableWeeks.map((value) => <option key={value} value={value}>Week {value}</option>)}
          </select>
        </label>
        <label htmlFor="archive-month">
          <span>Month</span>
          <select id="archive-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">All months</option>
            {availableMonths.map((value) => <option key={value} value={value}>{monthNames[value]}</option>)}
          </select>
        </label>
        <label htmlFor="archive-year">
          <span>Year</span>
          <select id="archive-year" value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">All years</option>
            {availableYears.map((value) => <option key={value} value={value}>{value}</option>)}
            {datedArticles.some(({ date }) => !date?.year) && <option value="unknown">Year not supplied</option>}
          </select>
        </label>
      </div>
      <div className="archive-results-heading" aria-live="polite">
        <span>{filteredArticles.length} {filteredArticles.length === 1 ? "work" : "works"}</span>
        {hasFilters && (
          <button className="archive-clear" type="button" onClick={() => {
            setQuery("");
            setWeek("all");
            setMonth("all");
            setYear("all");
          }}>
            Clear filters
          </button>
        )}
      </div>
      {filteredArticles.length > 0 ? (
        <div className="article-grid archive-results">
          {filteredArticles.map(({ article }) => <ArticleCard key={article.slug} article={article} />)}
        </div>
      ) : <p className="empty-archive">No works match these filters.</p>}
    </div>
  );
}