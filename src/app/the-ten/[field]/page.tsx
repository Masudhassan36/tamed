import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/ArticleCard";
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

  return (
    <main className="field-page page-width">
      <Link className="back-link" href="/the-ten">← The Ten</Link>
      <header className="field-header">
        <p className="eyebrow">Field {field.number} / TAMED</p>
        <h1>{field.title}</h1>
        <p>{field.description}</p>
      </header>
      <section className="field-featured">
        <SectionTitle eyebrow="Selected by the editors" title="Featured Pieces" />
        {fieldArticles.length > 0 ? (
          <div className="article-grid">
            {fieldArticles.slice(0, 1).map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
          </div>
        ) : <p className="empty-field">The editors are preparing this field. New work will appear here soon.</p>}
      </section>
      <section className="field-latest">
        <SectionTitle eyebrow="Recently published" title="Latest Pieces" />
        {fieldArticles.length > 1 ? (
          <div className="article-grid">
            {fieldArticles.slice(1).map((article) => <ArticleCard key={article.slug} article={toArticleCardData(article)} />)}
          </div>
        ) : (
          <p className="empty-field">This field&apos;s archive is growing. Visit again for its latest writing.</p>
        )}
      </section>
    </main>
  );
}