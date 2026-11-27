import type { ArticleCardData } from "./articles";

export function matchesArticleSearch(article: ArticleCardData, normalizedQuery: string): boolean {
  if (normalizedQuery.startsWith("tmd-")) {
    return article.id.toLowerCase().startsWith(normalizedQuery);
  }

  return [`${article.title} ${article.author ?? ""}`, article.fieldTitle, article.field]
    .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}
