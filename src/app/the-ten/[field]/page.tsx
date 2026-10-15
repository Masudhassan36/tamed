import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollection from "@/components/ArticleCollection";
import SectionTitle from "@/components/SectionTitle";
import { getArticlesByField, toArticleCardData } from "@/lib/articles";
import { theTen } from "@/lib/content";

export function generateStaticParams() {
  return theTen.map(({ slug }) => ({ field: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ field: string }> }): Promise<Metadata> {
  const { field: slug } = await params;
  const field = theTen.find((item) => item.slug === slug);
  if (!field) return { title: "Editorial field not found" };

  return {
    title: field.title,
    description: `${field.description} Read work in ${field.title} at TAMED™.`,
  };
}

export default async function EditorialFieldPage({ params }: { params: Promise<{ field: string }> }) {
  const { field: slug } = await params;
  const field = theTen.find((item) => item.slug === slug);
  if (!field) notFound();

  const fieldArticles = getArticlesByField(field.slug);
  const subsections = field.subsections ?? [];

  return (
    <main className="field-page page-width">
      <Link className="back-link" href="/the-ten">← The Ten</Link>
      <header className="field-header">
        <p className="eyebrow">Field {field.number} / TAMED</p>
        <h1>{field.title}</h1>
        <p>{field.description}</p>
        {subsections.length > 0 && (
          <div className="field-subsections">
            <p className="field-subsections-label">Subsections</p>
            <ul className="field-subsections-list">
              {subsections.map((subsection) => (
                <li key={subsection.slug}>{subsection.title}</li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <section className="field-latest">
        <SectionTitle eyebrow="Across every issue" title="The Field" description="Browse this category by top rated work, latest publication, or issue." />
        <ArticleCollection articles={fieldArticles.map(toArticleCardData)} emptyMessage="This field's archive is growing. Visit again for its latest writing." />
      </section>
    </main>
  );
}
