export type EditorialFieldSlug =
  | "fiction"
  | "poetry"
  | "personal-essays"
  | "letters"
  | "philosophy"
  | "criticism"
  | "satire"
  | "society"
  | "flesh"
  | "science";

/** Published alongside The Ten rather than inside it. */
export type StandaloneCategorySlug = "sci-fi";

export type CategorySlug = EditorialFieldSlug | StandaloneCategorySlug;

export type EditorialCategory = {
  slug: CategorySlug;
  title: string;
  /** One line naming the kinds of work the category takes. */
  description: string;
  /** The Ten are numbered; a standalone category carries no number. */
  number: string | null;
};

export const theTen: EditorialCategory[] = [
  {
    number: "01",
    slug: "fiction",
    title: "Fiction",
    description: "Literary realism, historical fiction, the gothic, the uncanny, the speculative.",
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
    slug: "satire",
    title: "Satire",
    description: "Parody and irony, political comedy, the mock form, the absurd, the joke with an edge.",
  },
  {
    number: "08",
    slug: "society",
    title: "Society",
    description: "Class and labour, gender and family, religion and power, migration, the city and the village.",
  },
  {
    number: "09",
    slug: "flesh",
    title: "Flesh",
    description: "Body horror, transformation, the folkloric body, the scientific body, the grotesque.",
  },
  {
    number: "10",
    slug: "science",
    title: "Science",
    description: "Natural history, ecology and the environment, medicine, technology and the machine.",
  },
];

/**
 * Sci-Fi runs alongside The Ten rather than inside it: it is offered to writers
 * as its own category, and it is reached at /the-ten/sci-fi like any other.
 */
export const standaloneCategories: EditorialCategory[] = [
  {
    number: null,
    slug: "sci-fi",
    title: "Sci-Fi",
    description: "Speculative futures, space and the machine, artificial minds, the altered body, the world after.",
  },
];

export const editorialCategories: EditorialCategory[] = [...theTen, ...standaloneCategories];

export const categorySlugs: CategorySlug[] = editorialCategories.map((category) => category.slug);

export function findCategory(slug: string): EditorialCategory | undefined {
  return editorialCategories.find((category) => category.slug === slug);
}

export function isInTheTen(slug: string): boolean {
  return theTen.some((category) => category.slug === slug);
}
