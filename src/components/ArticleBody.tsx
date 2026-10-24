import type { ReactNode } from "react";
import type { Article, RichContentBlock, RichContentRun } from "@/lib/articles";
import { getArticleLines, hasManuscriptText, isVerseArticle } from "@/lib/articles";
import { cleanTypography, mergeLeadingPunctuation, splitGluedParagraphs, splitOverlongParagraph } from "@/lib/typography";

type ArticleBodyProps = { article: Article };
type DisplayBlock = { kind: "paragraph" | "quote" | "heading" | "break"; runs?: RichContentRun[] };

const HEADING_MAX_LENGTH = 64;
const HEADING_MAX_WORDS = 9;
const headingPattern = /^[A-Z][^.!?,:;]{1,64}$/;
const quotePattern = /^[“"‘«][\s\S]*[”"’»]$/;
const dialoguePattern = /^[“"][\s\S]*[”"][\s\S]{0,100}$/;

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isShortHeadline(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  return text.length <= HEADING_MAX_LENGTH && text.split(/\s+/).length <= HEADING_MAX_WORDS && headingPattern.test(text);
}

function isHeading(text: string, article: Article): boolean {
  const value = text.trim();
  if (!value || normalise(value) === normalise(article.title)) return false;
  return isShortHeadline(value);
}

function renderRuns(runs: RichContentRun[], keyPrefix: string) {
  return runs.map((run, index) => {
    let content: ReactNode = cleanTypography(run.text);
    if (run.underline) content = <u>{content}</u>;
    if (run.italic) content = <em>{content}</em>;
    if (run.bold) content = <strong>{content}</strong>;
    return <span className="manuscript-run" key={`${keyPrefix}-${index}`}>{content}</span>;
  });
}

function classify(text: string, article: Article): DisplayBlock["kind"] {
  const value = text.trim();
  if (!value) return "break";
  if (!isVerseArticle(article) && isHeading(value, article)) return "heading";
  if (!isVerseArticle(article) && (quotePattern.test(value) || dialoguePattern.test(value))) return "quote";
  return "paragraph";
}

function plainBlocks(article: Article): DisplayBlock[] {
  if (isVerseArticle(article)) {
    return getArticleLines(article).map((line) =>
      line.trimEnd() ? { kind: "paragraph", runs: [{ text: line.trimEnd() }] } : { kind: "break" },
    );
  }
  const blocks: DisplayBlock[] = [];
  // Issue 2's imported PDF content contains physical lines, as do manuscripts.
  // Earlier web articles and fallback excerpts already store whole paragraphs.
  const wrapped = hasManuscriptText(article)
    || (article.id.startsWith("TMD-") && article.issue >= 2)
    || article.content.some((line) => !line.trim() || /[\r\n]/.test(line));
  let lines: string[] = [];
  const flush = () => {
    const text = cleanTypography(lines.join(" "));
    lines = [];
    for (const paragraph of splitGluedParagraphs(text).flatMap((part) => splitOverlongParagraph(part))) {
      blocks.push({ kind: classify(paragraph, article), runs: [{ text: paragraph }] });
    }
  };
  const sourceLines = wrapped ? getArticleLines(article) : mergeLeadingPunctuation(getArticleLines(article));
  for (const [index, line] of sourceLines.entries()) {
    if (!line.trim()) {
      flush();
      blocks.push({ kind: "break" });
      continue;
    }
    if (normalise(line) === normalise(article.title)) {
      flush();
      blocks.push({ kind: "paragraph", runs: [{ text: line.trim() }] });
      continue;
    }
    const standalone = !sourceLines[index + 1]?.trim() || line === line.toUpperCase();
    if (isHeading(line, article) && (!wrapped || standalone)) {
      flush();
      blocks.push({ kind: "heading", runs: [{ text: line.trim() }] });
      continue;
    }
    lines.push(line.trim());
    if (!wrapped) flush();
  }
  flush();
  return blocks;
}

function richBlocks(article: Article, richContent: RichContentBlock[]): DisplayBlock[] {
  return richContent.map((block) => {
    const runs = block?.filter((run) => run.text.length > 0) ?? [];
    if (!runs.length) return { kind: "break" };
    const text = cleanTypography(runs.map((run) => run.text).join(""));
    // A manuscript sets its section titles in bold; trust that over guesswork.
    const boldHeadline = !isVerseArticle(article) && runs.every((run) => run.bold) && isShortHeadline(text);
    return { kind: boldHeadline ? "heading" : classify(text, article), runs };
  });
}

function withoutRepeatedTitle(article: Article, blocks: DisplayBlock[]): DisplayBlock[] {
  const firstContent = blocks.findIndex((block) => block.kind !== "break");
  if (firstContent < 0) return blocks;
  const first = blocks[firstContent];
  const firstText = first.runs?.map((run) => run.text).join("") ?? "";
  return normalise(firstText) === normalise(article.title) ? blocks.slice(firstContent + 1) : blocks;
}

export default function ArticleBody({ article }: ArticleBodyProps) {
  const isVerse = isVerseArticle(article);
  const bodyClass = isVerse ? "article-body article-body--verse" : "article-body article-body--prose";
  const sourceBlocks = article.richContent?.length ? richBlocks(article, article.richContent) : plainBlocks(article);
  const blocks = withoutRepeatedTitle(article, sourceBlocks);

  return (
    <div className={bodyClass} aria-label="Published manuscript">
      {blocks.map((block, index) => {
        if (block.kind === "break") return <span className="manuscript-break" aria-hidden="true" key={`break-${index}`} />;
        const content = renderRuns(block.runs ?? [], `block-${index}`);
        if (block.kind === "heading") return <h2 className="manuscript-heading" key={`heading-${index}`}>{content}</h2>;
        if (block.kind === "quote") return <blockquote className="manuscript-quote" key={`quote-${index}`}>{content}</blockquote>;
        return <p className={isVerse ? "verse-line" : "manuscript-line"} key={`paragraph-${index}`}>{content}</p>;
      })}
    </div>
  );
}
