import articleRecords from "./articles-data.json";
import { theTen } from "./content";
import type { EditorialFieldSlug } from "./content";

export const EDITORIAL_RATINGS = {
  "5+": "Exceptional",
  "5": "Outstanding",
  "4+": "Excellent",
  "4": "Strong",
  "3+": "Promising",
  "3": "Developing",
} as const;

export type EditorialRating = keyof typeof EDITORIAL_RATINGS;
export type AuthorType = "real-name" | "pen-name" | "anonymous";
export type ArticleStatus = "draft" | "review" | "accepted" | "published" | "archived";

export interface ArticleSubmissionFields {
  id: string;
  slug: string;
  title: string;
  field: EditorialFieldSlug;
  authorType: AuthorType;
  writerName?: string;
  penName?: string;
  excerpt: string;
  coverImage?: string;
  content: string[];
  language: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  field: EditorialFieldSlug;
  author: string | null;
  authorType: AuthorType | null;
  excerpt: string;
  coverImage: string;
  imageAlt: string;
  content: string[];
  language: string | null;
  publishedAt: string | null;
  editorialRating: EditorialRating | null;
  editorsNote: string | null;
  status: ArticleStatus;
  readingTime?: string;
  sourceUrl?: string;
}

export type ArticleCardData = Pick<
  Article,
  "slug" | "field" | "author" | "editorialRating" | "excerpt" | "coverImage" | "imageAlt" | "title" | "publishedAt"
> & {
  fieldTitle: string;
};

const allArticles = articleRecords as unknown as Article[];

export function createReviewArticleFromSubmission(submission: ArticleSubmissionFields): Article {
  const author = submission.authorType === "anonymous"
    ? null
    : submission.authorType === "pen-name"
      ? submission.penName?.trim() || null
      : submission.writerName?.trim() || null;

  return {
    id: submission.id,
    slug: submission.slug,
    title: submission.title,
    field: submission.field,
    author,
    authorType: submission.authorType,
    excerpt: submission.excerpt,
    coverImage: submission.coverImage ?? "",
    imageAlt: `Cover image for ${submission.title}`,
    content: submission.content,
    language: submission.language,
    publishedAt: null,
    editorialRating: null,
    editorsNote: null,
    status: "review",
  };
}

export function getPublishedArticles(): Article[] {
  return allArticles.filter((article) => article.status === "published");
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getPublishedArticles().find((article) => article.slug === slug);
}

export function getArticlesByField(field: EditorialFieldSlug): Article[] {
  return getPublishedArticles().filter((article) => article.field === field);
}

export function getFeaturedArticle(): Article | undefined {
  return getArticleBySlug("the-monster-was-always-the-monster");
}

export function getFieldTitle(field: EditorialFieldSlug): string {
  return theTen.find((item) => item.slug === field)?.title ?? field;
}

export function toArticleCardData(article: Article): ArticleCardData {
  return {
    slug: article.slug,
    field: article.field,
    fieldTitle: getFieldTitle(article.field),
    author: article.author,
    editorialRating: article.editorialRating,
    excerpt: article.excerpt,
    coverImage: article.coverImage,
    imageAlt: article.imageAlt,
    title: article.title,
    publishedAt: article.publishedAt,
  };
}
