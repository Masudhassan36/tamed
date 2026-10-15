import type { ReactNode } from "react";
import type { Article, RichContentBlock, RichContentRun } from "@/lib/articles";
import { getArticleLines, isVerseArticle } from "@/lib/articles";

type ArticleBodyProps = { article: Article };
type DisplayBlock = { kind: "paragraph" | "quote" | "heading" | "break"; runs?: RichContentRun[] };

const headingPattern = /^[A-Z][^.!?,:;]{1,64}$/;
const quotePattern = /^[“"‘«][\s\S]*[”"’»]$/;

function cleanTypography(value: string): string {
  return value
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/Â/g, "");
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isHeading(text: string, article: Article): boolean {
  const value = text.trim();
  if (!value || normalise(value) === normalise(article.title)) return false;
  return value.length <= 64 && value.split(/\s+/).length <= 9 && headingPattern.test(value);
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
  if (!isVerseArticle(article) && quotePattern.test(value)) return "quote";
  return "paragraph";
}

function plainBlocks(article: Article): DisplayBlock[] {
  if (isVerseArticle(article)) {
    return getArticleLines(article).map((line) => line.trimEnd() ? { kind: "paragraph", runs: [{ text: line.trimEnd() }] } : { kind: "break" });
  }
  const blocks: DisplayBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    const text = cleanTypography(lines.join(" ").replace(/\s+/g, " ").trim());
    if (text) blocks.push({ kind: classify(text, article), runs: [{ text }] });
    lines = [];
  };
  for (const line of getArticleLines(article)) {
    if (!line.trim()) { flush(); blocks.push({ kind: "break" }); continue; }
    if (isHeading(line, article)) { flush(); blocks.push({ kind: "heading", runs: [{ text: line.trim() }] }); continue; }
    lines.push(line.trim());
  }
  flush();
  return blocks;
}

function richBlocks(article: Article, richContent: RichContentBlock[]): DisplayBlock[] {
  const blocks: DisplayBlock[] = richContent.map((block) => {
    const runs = block?.filter((run) => run.text.length > 0) ?? [];
    if (!runs.length) return { kind: "break" };
    const text = cleanTypography(runs.map((run) => run.text).join(""));
    return { kind: classify(text, article), runs };
  });
  return blocks;
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
