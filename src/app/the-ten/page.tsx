import type { Metadata } from "next";
import TenCard from "@/components/TenCard";
import SectionTitle from "@/components/SectionTitle";
import { standaloneCategories, theTen } from "@/lib/content";

export const metadata: Metadata = {
  title: "The Ten",
  description: "Explore the ten editorial fields through which TAMED™ reads and publishes writing.",
};

export default function TheTenPage() {
  return (
    <main className="ten-page page-width">
      <header className="ten-page-header">
        <p className="eyebrow">An editorial index</p>
        <h1>The Ten</h1>
        <p>The Ten are the ten editorial fields through which TAMED reads and publishes writing. They are ways into a work, not limits on what it can become.</p>
      </header>
      <section className="ten-index" aria-labelledby="ten-index-title">
        <SectionTitle eyebrow="01—10 / Fields of attention" title="An open index" number="10 fields" />
        <div className="ten-list">
          {theTen.map((field) => <TenCard key={field.slug} field={field} />)}
        </div>
        <div className="ten-alongside">
          <p className="eyebrow">Alongside the ten</p>
          <p className="ten-alongside-note">A category published outside the numbered index, and offered to writers on the same terms.</p>
          <div className="ten-list">
            {standaloneCategories.map((field) => <TenCard key={field.slug} field={field} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
