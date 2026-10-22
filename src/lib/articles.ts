import articleRecords from "./articles-data.json";
import ratedSubmissionRecords from "./rated-submissions.json";
import manuscriptRecords from "./manuscripts.json";
import { findCategory } from "./content";
import type { CategorySlug } from "./content";

export const EDITORIAL_RATINGS = {
  "5+": "Exceptional",
  "5": "Outstanding",
  "4+": "Excellent",
  "4": "Strong",
  "3+": "Promising",
  "3": "Developing",
} as const;

export type EditorialRating = "2+" | "2" | keyof typeof EDITORIAL_RATINGS;
export type AuthorType = "real-name" | "pen-name" | "anonymous";
export type ArticleStatus = "draft" | "review" | "accepted" | "published" | "archived";

export interface ArticleSubmissionFields {
  id: string;
  slug: string;
  title: string;
  field: CategorySlug;
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
  field: CategorySlug;
  author: string | null;
  authorType: AuthorType | null;
  excerpt: string;
  coverImage: string;
  imageAlt: string;
  content: string[];
  richContent?: RichContentBlock[];
  language: string | null;
  publishedAt: string | null;
  issue: number;
  editorialRating: EditorialRating | null;
  editorsNote: string | null;
  status: ArticleStatus;
  readingTime?: string;
  sourceUrl?: string;
  originalFile?: string;
}

export type RichContentRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type RichContentBlock = RichContentRun[];

export type ArticleCardData = Pick<
  Article,
  "slug" | "field" | "author" | "editorialRating" | "coverImage" | "imageAlt" | "title" | "publishedAt"
> & {
  fieldTitle: string;
  firstLine: string | null;
  issue: number;
};

const allArticles = (articleRecords as unknown as Article[]).map((article) => ({
  ...article,
  publishedAt: normalizePublicationDate(article.publishedAt),
  issue: article.issue ?? 1,
}));

// Rated submissions are fed from rated-submissions.json. The manuscript text is
// stored alongside, and richText formatting is preserved via richContent.
type RatedSubmissionRecord = {
  id: string;
  title: string;
  field: string;
  author: string | null;
  rating: string | null;
  editorialNote: string | null;
  manuscript: string | null;
  cover: string | null;
  date: string | null;
  issue?: number;
  language: string | null;
  excerpt: string;
  content: string[];
  richContent?: RichContentBlock[];
  originalFile?: string;
};

const manuscriptTextById = manuscriptRecords as Readonly<Record<string, string>>;

const ISSUE_ONE_DATE = "2026-10-14";

function normalizePublicationDate(value: string | null): string | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `2026-${iso[2]}-${iso[3]}`;
  const monthDay = /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*\d{4})?$/.exec(value.trim());
  if (monthDay) {
    const month = new Date(`${monthDay[1]} 1, 2026`).getMonth() + 1;
    return `${2026}-${String(month).padStart(2, "0")}-${String(Number(monthDay[2])).padStart(2, "0")}`;
  }
  return value;
}

// A Google Drive share link never renders inside an <img>. Convert it to the
// static image endpoint that does.
export function resolveCoverImage(cover: string | null | undefined, fallback = "/images/articles/rated/editorial-cover.png"): string {
  if (!cover) return fallback;
  if (/google\.com/.test(cover)) {
    const driveId = cover.match(/\/file\/d\/([^/]+)/)?.[1] ?? cover.match(/[?&]id=([^&/]+)/)?.[1];
    if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  return cover;
}

// The writer's own line breaks: the manuscript text when we have it, otherwise
// the stored content, split on whatever newlines survived extraction.
export function getArticleLines(article: Article): string[] {
  const manuscript = manuscriptTextById[article.id];
  if (manuscript) return manuscript.split("\n");
  return article.content.flatMap((block) => String(block).split(/\r?\n/));
}

export function isVerseArticle(article: Article): boolean {
  return article.field === "poetry";
}

const normaliseHeading = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const STANDFIRST_LIMIT = 180;

// The first line of the manuscript, shown beneath the title. When the opening
// line is itself the title we move on to the next line, and a very long opening
// paragraph is trimmed back to its first sentence so it still reads as a deck.
export function getStandfirst(article: Article): string | null {
  const lines = getArticleLines(article).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return null;
  const title = normaliseHeading(article.title);
  const candidate = lines.find((line) => normaliseHeading(line) !== title);
  if (!candidate) return null;
  if (candidate.length <= STANDFIRST_LIMIT) return candidate;
  const firstSentence = candidate.match(/^.*?[.!?…](?=\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= STANDFIRST_LIMIT) return firstSentence;
  return `${candidate.slice(0, STANDFIRST_LIMIT - 1).trimEnd()}…`;
}

// Returns the first content line of the article (skipping the title line if the
// manuscript opens with it). Used as the crux/subtitle on article cards.
export function getFirstLine(article: Article): string | null {
  const lines = getArticleLines(article).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return null;
  const title = normaliseHeading(article.title);
  const candidate = lines.find((line) => normaliseHeading(line) !== title);
  return candidate ?? null;
}

const ratedSubmissions: Article[] = (ratedSubmissionRecords as Partial<RatedSubmissionRecord>[])
  .filter((record): record is RatedSubmissionRecord => Boolean(record?.id && record.title))
  .map((record) => {
    const manuscript = manuscriptTextById[record.id];
    const storedContent = Array.isArray(record.content) ? record.content : ["Read the complete manuscript through the public link below."];
    const lines = manuscript ? manuscript.split("\n") : storedContent.flatMap((block) => String(block).split(/\r?\n/));
    return {
      id: record.id,
      slug: record.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title: record.title,
      field: (record.field ?? "poetry") as CategorySlug,
      author: record.author,
      authorType: "pen-name" as AuthorType,
      excerpt: record.excerpt ?? "A published piece from the TAMED editorial archive.",
      coverImage: resolveCoverImage(record.cover),
      imageAlt: `Cover image for ${record.title}`,
      content: lines,
      richContent: record.richContent,
      language: record.language ?? "English",
      publishedAt: ISSUE_ONE_DATE,
      issue: 1,
      editorialRating: (record.rating?.match(/^[2-5](?:\+)?/)?.[0] ?? null) as EditorialRating | null,
      editorsNote: record.editorialNote || null,
      status: "published" as ArticleStatus,
      sourceUrl: record.manuscript ?? undefined,
      originalFile: record.originalFile ?? undefined,
    };
  });

const publishedFeed = [...allArticles, ...ratedSubmissions];
const ratingWeight = (rating: EditorialRating | null) => rating ? ({ "5+": 7, "5": 6, "4+": 5, "4": 4, "3+": 3, "3": 2, "2+": 1, "2": 0.5 }[rating]) : 0;
const dateWeight = (value: string | null) => value ? Date.parse(value.length === 7 ? `${value}-01` : value) || 0 : 0;
const minimumPublicationRating: EditorialRating = "3";

export function isPublicationEligible(article: Article): boolean {
  if (!article.status || article.status !== "published") return false;
  const rating = article.editorialRating;
  if (!rating) return true;
  return ratingWeight(rating) >= ratingWeight(minimumPublicationRating);
}

export function formatPublicationDate(value: string | null): string | null {
  const normalized = normalizePublicationDate(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
}

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
    issue: 1,
    editorialRating: null,
    editorsNote: null,
    status: "review",
  };
}

export function getPublishedArticles(): Article[] {
  return publishedFeed
    .filter((article) => article.status === "published" && isPublicationEligible(article))
    .sort((a, b) => dateWeight(b.publishedAt) - dateWeight(a.publishedAt));
}

export function getAvailableIssues(): number[] {
  return Array.from(new Set(getPublishedArticles().map((article) => article.issue))).sort((a, b) => b - a);
}

export function getLatestIssue(): number {
  return getAvailableIssues()[0] ?? 1;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getPublishedArticles().find((article) => article.slug === slug);
}

export function getArticlesByField(field: CategorySlug): Article[] {
  return getPublishedArticles().filter((article) => article.field === field).sort((a, b) => ratingWeight(b.editorialRating) - ratingWeight(a.editorialRating) || dateWeight(b.publishedAt) - dateWeight(a.publishedAt));
}

export function getFeaturedArticle(): Article | undefined {
  const currentIssue = getLatestIssue();
  const candidates = getPublishedArticles().filter(
    (article) =>
      (article.issue === currentIssue && article.editorialRating !== null) ||
      article.author?.trim().toLocaleLowerCase() === "onu",
  );
  if (candidates.length === 0) return undefined;

  const dateParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = ["year", "month", "day"]
    .map((type) => dateParts.find((part) => part.type === type)?.value ?? "")
    .join("-");
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, dayOfMonth) / 86_400_000);
  const candidateCount = candidates.length;
  let step = 7;
  const greatestCommonDivisor = (left: number, right: number): number =>
    right === 0 ? left : greatestCommonDivisor(right, left % right);
  while (greatestCommonDivisor(step, candidateCount) !== 1) {
    step += 1;
  }
  const offset = candidates.reduce((total, article) => total + article.slug.length, 0) % candidateCount;
  return candidates[(dayNumber * step + offset) % candidateCount];
}

export function getAlwaysRecommendedArticles(): Article[] {
  const articles = getPublishedArticles();
  const topRated = articles
    .filter((article) => article.issue === getLatestIssue() && article.editorialRating !== null)
    .sort((a, b) => ratingWeight(b.editorialRating) - ratingWeight(a.editorialRating))[0];
  const writtenByOnu = articles.find((article) => article.author?.trim().toLocaleLowerCase() === "onu");
  return [topRated, writtenByOnu].filter(
    (article, index, list): article is Article => Boolean(article) && list.findIndex((item) => item?.slug === article?.slug) === index,
  );
}

export function getFieldTitle(field: CategorySlug): string {
  return findCategory(field)?.title ?? field;
}

export function toArticleCardData(article: Article): ArticleCardData {
  return {
    slug: article.slug,
    field: article.field,
    fieldTitle: getFieldTitle(article.field),
    author: article.author,
    editorialRating: article.editorialRating,
    coverImage: article.coverImage,
    imageAlt: article.imageAlt,
    title: article.title,
    publishedAt: article.publishedAt,
    firstLine: getFirstLine(article),
    issue: article.issue,
  };
}
