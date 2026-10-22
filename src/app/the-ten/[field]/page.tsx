import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollection from "@/components/ArticleCollection";
import SectionTitle from "@/components/SectionTitle";
import { getArticlesByField, toArticleCardData } from "@/lib/articles";
import { editorialCategories, findCategory, isInTheTen } from "@/lib/content";

export function generateStaticParams() {
  return editorialCategories.map(({ slug }) => ({ field: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ field: string }> }): Promise<Metadata> {
  const { field: slug } = await params;
  const category = findCategory(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: category.title,
    description: `${category.description} Read work in ${category.title} at TAMED™.`,
  };
}

export default async function EditorialFieldPage({ params }: { params: Promise<{ field: string }> }) {
  const { field: slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  const categoryArticles = getArticlesByField(category.slug);
  const isField = isInTheTen(category.slug);

  return (
    <main className="field-page page-width">
      <Link className="back-link" href="/the-ten">← The Ten</Link>
      <header className="field-header">
        <p className="eyebrow">{category.number ? `Field ${category.number} / TAMED` : "Published alongside The Ten"}</p>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
      </header>
      <section className="field-latest">
        <SectionTitle eyebrow="Across every issue" title={isField ? "The Field" : "The Category"} description="Browse this category by top rated work, latest publication, or issue." />
        <ArticleCollection articles={categoryArticles.map(toArticleCardData)} emptyMessage="This category's archive is growing. Visit again for its latest writing." />
      </section>
    </main>
  );
}
