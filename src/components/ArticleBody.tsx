import type { ReactNode } from "react";
import type { Article, ManuscriptParagraph, RichContentBlock, RichContentRun } from "@/lib/articles";
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
    let content: ReactNode = run.text;
    if (run.strike) content = <s>{content}</s>;
    if (run.verticalAlign === "super") content = <sup>{content}</sup>;
    if (run.verticalAlign === "sub") content = <sub>{content}</sub>;
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

function richBlocks(richContent: RichContentBlock[]): DisplayBlock[] {
  return richContent.map((block) => {
    const runs = block?.filter((run) => run.text.length > 0) ?? [];
    if (!runs.length) return { kind: "break" };
    // Rich manuscripts already carry their emphasis. Inference here would
    // italicize ordinary dialogue or restyle a short sentence as a heading.
    return { kind: "paragraph", runs };
  });
}

function withoutRepeatedTitle(article: Article, blocks: DisplayBlock[]): DisplayBlock[] {
  const firstContent = blocks.findIndex((block) => block.kind !== "break");
  if (firstContent < 0) return blocks;
  const first = blocks[firstContent];
  const firstText = first.runs?.map((run) => run.text).join("") ?? "";
  return normalise(firstText) === normalise(article.title) ? blocks.slice(firstContent + 1) : blocks;
}

function reflowPdfProse(blocks: ManuscriptParagraph[]): ManuscriptParagraph[] {
  const gaps = blocks
    .filter((block, index) => block.sourceLine && !block.pageBreakBefore && blocks[index - 1]?.sourceLine)
    .map((block) => block.spaceBefore ?? 0)
    .sort((a, b) => a - b);
  // Some PDFs have more paragraph breaks than wrapped lines. Use a
  // recurring tighter gap when the wider spacing dominates the document.
  const lineGap = gaps.find((gap, index) => gaps[index + 2] - gap <= 0.5)
    ?? gaps[Math.floor(gaps.length / 4)] ?? 0;
  const paragraphGap = lineGap + Math.max(4, lineGap * 0.25);
  const paragraphs: ManuscriptParagraph[] = [];
  let active: ManuscriptParagraph | undefined;
  let previous: ManuscriptParagraph | undefined;
  for (const block of blocks) {
    if (!block.sourceLine || block.table || block.separator || !block.runs.some((run) => run.text.trim())) {
      paragraphs.push(block);
      active = previous = undefined;
      continue;
    }
    const priorText = previous?.runs.map((run) => run.text).join("") ?? "";
    const currentText = block.runs.map((run) => run.text).join("");
    const sentenceEnds = /[.!?।…][”"'’»)]*$/u.test(priorText.trimEnd());
    const sectionLabel = /^(?:\d{1,3}[.)]|(?:chapter|part|section)\s+(?:\d+|[ivxlcdm]+))$/iu;
    const sectionBreak = sectionLabel.test(currentText.trim()) || sectionLabel.test(priorText.trim());
    const dialogueBreak = sentenceEnds && priorText.trim().length < 45
      && /^\s*[“"«]/u.test(currentText);
    const indented = (block.indentLeft ?? 0) - (previous?.indentLeft ?? 0) >= 8;
    if (!active || indented || sectionBreak || dialogueBreak || (block.spaceBefore ?? 0) > paragraphGap
      || (block.pageBreakBefore && sentenceEnds)) {
      active = { runs: [...block.runs], alignment: block.alignment };
      paragraphs.push(active);
    } else {
      if (!/\s$/u.test(priorText) && !/^\s/u.test(block.runs[0]?.text ?? "")) {
        active.runs.push({ text: " " });
      }
      active.runs.push(...block.runs);
    }
    previous = block;
  }
  return paragraphs;
}

export default function ArticleBody({ article }: ArticleBodyProps) {
  const language = /^(bangla|bengali|bn)$/i.test(article.language ?? "") ? "bn" : undefined;
  const isVerse = isVerseArticle(article);
  if (article.manuscriptParagraphs?.length) {
    const paragraphs = isVerse ? article.manuscriptParagraphs : reflowPdfProse(article.manuscriptParagraphs);
    return (
      <div className={`article-body article-body--original ${isVerse ? "article-body--verse" : "article-body--prose"}`} aria-label="Published manuscript" lang={language}>
        {paragraphs.map((paragraph, index) => renderManuscriptParagraph(paragraph, `original-${index}`))}
      </div>
    );
  }
  const bodyClass = isVerse ? "article-body article-body--verse" : "article-body article-body--prose";
  const sourceBlocks = article.richContent?.length ? richBlocks(article.richContent) : plainBlocks(article);
  const blocks = withoutRepeatedTitle(article, sourceBlocks);

  return (
    <div className={bodyClass} aria-label="Published manuscript" lang={language}>
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

function renderManuscriptParagraph(paragraph: ManuscriptParagraph, key: string): ReactNode {
  if (paragraph.table) return (
    <div className="manuscript-table-scroll" key={key}>
      <table className="manuscript-table"><tbody>
        {paragraph.table.map((row, rowIndex) => <tr key={rowIndex}>
          {row.map((cell, cellIndex) => <td key={cellIndex}>
            {cell.map((block, blockIndex) => renderManuscriptParagraph(block, `${key}-${rowIndex}-${cellIndex}-${blockIndex}`))}
          </td>)}
        </tr>)}
      </tbody></table>
    </div>
  );
  if (paragraph.separator) return <hr className="manuscript-divider" key={key} />;
  return <p key={key} className={paragraph.pageBreakBefore ? "manuscript-page-start" : undefined} style={{
    textAlign: paragraph.alignment,
    marginTop: paragraph.spaceBefore === undefined ? undefined : `${paragraph.spaceBefore}pt`,
    marginBottom: paragraph.spaceAfter === undefined ? undefined : `${paragraph.spaceAfter}pt`,
    paddingLeft: paragraph.indentLeft === undefined ? undefined : `${paragraph.indentLeft}pt`,
    paddingRight: paragraph.indentRight === undefined ? undefined : `${paragraph.indentRight}pt`,
    textIndent: paragraph.indentFirst === undefined ? undefined : `${paragraph.indentFirst}pt`,
  }}>{paragraph.runs.length ? renderRuns(paragraph.runs, key) : <br />}</p>;
}
