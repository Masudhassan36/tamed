export type EditorialFieldSlug =
  | "fiction"
  | "poetry"
  | "personal-essays"
  | "letters"
  | "philosophy"
  | "criticism"
  | "translation"
  | "fragments"
  | "satire"
  | "society";

export type EditorialField = {
  slug: EditorialFieldSlug;
  number: string;
  title: string;
  description: string;
};

export const theTen: EditorialField[] = [
  { number: "01", slug: "fiction", title: "Fiction", description: "Stories that never happened, but reveal something true." },
  { number: "02", slug: "poetry", title: "Poetry", description: "Language made attentive to its own music." },
  { number: "03", slug: "personal-essays", title: "Personal Essays", description: "A life examined without looking away." },
  { number: "04", slug: "letters", title: "Letters", description: "Words addressed to someone, somewhere, or no one at all." },
  { number: "05", slug: "philosophy", title: "Philosophy", description: "Questions that keep their edges." },
  { number: "06", slug: "criticism", title: "Criticism", description: "Reading closely; thinking in public." },
  { number: "07", slug: "translation", title: "Translation", description: "A voice carried across the distance between languages." },
  { number: "08", slug: "fragments", title: "Fragments", description: "Small forms with room for a whole world." },
  { number: "09", slug: "satire", title: "Satire", description: "The absurd, held up to the light." },
  { number: "10", slug: "society", title: "Society", description: "The structures we inherit, and the lives inside them." },
];
