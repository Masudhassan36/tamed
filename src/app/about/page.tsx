import Link from "next/link";
import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";

export const metadata: Metadata = {
  title: "About",
  description: "The philosophy, editorial principle, and BCWO connection behind TAMED™, an independent literary journal.",
};

export default function AboutPage() {
  return (
    <main className="institution-page page-width">
      <header className="institution-header">
        <p className="eyebrow">An independent literary journal</p>
        <h1>About TAMED</h1>
        <p>TAMED exists for writing that refuses to remain silent.</p>
      </header>
      <section className="institution-section about-intro">
        <SectionTitle eyebrow="01 / What we are" title="A journal for the unquiet voice" />
        <p className="institution-prose">TAMED is a literary journal for voices, ideas, and stories that refuse to remain silent. We publish work across ten editorial fields, making room for writing that is beautiful, uncomfortable, strange, painful, humorous, or impossible.</p>
      </section>
      <section className="institution-section about-manifesto">
        <SectionTitle eyebrow="02 / Our philosophy" title="A writer does not need permission to think." />
        <div className="manifesto-lines">
          <p>Identity should never determine the value of a voice.</p>
          <p>Writing should remain human.</p>
          <p>Writers may publish under their real name, a pen name, or anonymously.</p>
        </div>
      </section>
      <section className="institution-section about-principle">
        <SectionTitle eyebrow="03 / Editorial principle" title="The work comes first." />
        <p className="institution-prose">Every submission is read for its own voice and intent. A writer&apos;s identity is not a measure of a work&apos;s worth. Anonymous publication is available to writers who want their words read without their name attached.</p>
      </section>
      <section className="institution-section about-publisher">
        <SectionTitle eyebrow="04 / Published by" title="Bangladesh Creative Writing Olympiad" />
        <p className="institution-prose">TAMED is published by BCWO, an initiative supporting creative writing and literary expression.</p>
        <Link className="text-link" href="mailto:tamed@bcwo.org">Write to the editors <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}