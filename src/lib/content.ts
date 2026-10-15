export type EditorialFieldSlug =
  | "fiction"
  | "poetry"
  | "personal-essays"
  | "letters"
  | "philosophy"
  | "criticism"
  | "sci-fi"
  | "satire"
  | "society"
  | "flesh"
  | "science";

export type EditorialSubsection = {
  slug: string;
  title: string;
};

export type EditorialField = {
  slug: EditorialFieldSlug;
  number: string;
  title: string;
  /** One line naming the kinds of work the field takes. */
  description: string;
  subsections?: EditorialSubsection[];
};

export const theTen: EditorialField[] = [
  {
    number: "01",
    slug: "fiction",
    title: "Fiction",
    description: "Literary realism, historical fiction, the gothic, and the uncanny.",
  },
  {
    number: "02",
    slug: "poetry",
    title: "Poetry",
    description: "Lyric and narrative verse, free verse and received form, the elegy, the ode.",
  },
  {
    number: "03",
    slug: "personal-essays",
    title: "Personal Essays",
    description: "Memory and confession, family and inheritance, the body and the self, illness and grief.",
  },
  {
    number: "04",
    slug: "letters",
    title: "Letters",
    description: "Epistles and open letters, correspondence, the address to the dead, the unsent.",
  },
  {
    number: "05",
    slug: "philosophy",
    title: "Philosophy",
    description: "Metaphysics and ethics, mind and consciousness, language and truth, the examined life.",
  },
  {
    number: "06",
    slug: "criticism",
    title: "Criticism",
    description: "Books, film and music, art and culture, close reading, the argued review.",
  },
  {
    number: "07",
    slug: "sci-fi",
    title: "Sci-Fi",
    description: "Speculative worlds, artificial minds, impossible futures, and science made strange.",
  },
  {
    number: "08",
    slug: "satire",
    title: "Satire",
    description: "Parody and irony, political comedy, the mock form, the absurd, the joke with an edge.",
  },
  {
    number: "09",
    slug: "society",
    title: "Society",
    description: "Class and labour, gender and family, religion and power, migration, the city and the village.",
  },
  {
    number: "10",
    slug: "flesh",
    title: "Flesh",
    description: "Body horror, transformation, the folkloric body, the scientific body, the grotesque.",
  },
  {
    number: "11",
    slug: "science",
    title: "Science",
    description: "Natural history, ecology and the environment, medicine, technology and the machine.",
  },
];

export const editorialFieldSlugs: EditorialFieldSlug[] = theTen.map((field) => field.slug);

export function findEditorialField(slug: string): EditorialField | undefined {
  return theTen.find((field) => field.slug === slug);
}

/** Every selectable subsection, keyed as "field-slug:subsection-slug". */
export const editorialSubsectionKeys: string[] = theTen.flatMap((field) =>
  (field.subsections ?? []).map((subsection) => `${field.slug}:${subsection.slug}`)
);
