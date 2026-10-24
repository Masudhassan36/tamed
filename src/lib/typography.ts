const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/â€™/g, "’"],
  [/â€œ/g, "“"],
  [/â€\u009d/g, "”"],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€¦/g, "…"],
  [/Â/g, ""],
];

/** Repairs the common UTF-8/Latin-1 mojibake that survived earlier scraping. */
export function cleanTypography(value: string): string {
  return MOJIBAKE_MAP.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

const GLUED_SENTENCE = /(?<=[\p{Ll}\p{N})])[.!?…]+["'”’]?(?=\p{Lu}\p{Ll}|[“"‘])/gu;
const LEADING_PUNCTUATION = /^[.!?…,;:]+/;
const PARAGRAPH_CHAR_LIMIT = 900;

/**
 * A fragment that starts with punctuation ("." after "The difficulty lies in
 * description") belongs to the paragraph before it, not to a line of its own.
 */
export function mergeLeadingPunctuation(paragraphs: string[]): string[] {
  const merged: string[] = [];
  for (const paragraph of paragraphs) {
    const text = paragraph.trim();
    if (!text) continue;
    if (LEADING_PUNCTUATION.test(text) && merged.length) {
      const punctuation = text.match(LEADING_PUNCTUATION)?.[0] ?? "";
      merged[merged.length - 1] = `${merged[merged.length - 1]}${punctuation}`;
      const remainder = text.slice(punctuation.length).trim();
      if (remainder) merged.push(remainder);
      continue;
    }
    merged.push(text);
  }
  return merged;
}

/**
 * Extracted manuscripts often lost their paragraph breaks, leaving sentences
 * fused together ("…remarkable ease.It appears in…"). A sentence end followed
 * immediately by a capitalized word may be a lost break. Require a preceding
 * lowercase letter or digit to leave initials such as U.S.A. intact.
 */
export function splitGluedParagraphs(value: string): string[] {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const paragraphs: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  GLUED_SENTENCE.lastIndex = 0;
  while ((match = GLUED_SENTENCE.exec(text)) !== null) {
    const end = match.index + match[0].length;
    paragraphs.push(text.slice(cursor, end).trim());
    cursor = end;
  }
  paragraphs.push(text.slice(cursor).trim());
  return mergeLeadingPunctuation(paragraphs);
}

const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

/**
 * OCR'd manuscripts sometimes keep a whole page as one paragraph. Past the
 * readable limit we break on sentence boundaries so the column keeps its air.
 */
export function splitOverlongParagraph(value: string, limit = PARAGRAPH_CHAR_LIMIT): string[] {
  const text = value.trim();
  if (text.length <= limit) return text ? [text] : [];
  const sentences = Array.from(sentenceSegmenter.segment(text), ({ segment }) => segment);
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && `${current}${sentence}`.trim().length > limit) {
      parts.push(current.trim());
      current = sentence;
      continue;
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length ? parts : [text];
}
