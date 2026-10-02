import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TAMED™ handles writer information, anonymous publication, and submission privacy.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page page-width">
      <header className="institution-header">
        <p className="eyebrow">TAMED™ / Reader and writer information</p>
        <h1>Privacy</h1>
        <p>Writer identity belongs to the writer. Private contact details do not belong in a public byline.</p>
      </header>
      <section className="legal-section">
        <SectionTitle eyebrow="01 / Information" title="What a submission may include" />
        <p className="institution-prose">The submission preview asks for a name or pen name, email address, optional phone number, country, city, optional delivery address, publication preference, language, title, manuscript, and optional cover image. These fields describe the information a future submission service may request.</p>
      </section>
      <section className="legal-section">
        <SectionTitle eyebrow="02 / Current preview" title="Nothing is transmitted" />
        <p className="institution-prose">The current form is a front-end preview. It does not send submissions to TAMED or store the information entered. Do not enter sensitive personal information into a form unless and until an operational submission channel is clearly provided.</p>
      </section>
      <section className="legal-section">
        <SectionTitle eyebrow="03 / Editorial use" title="Private details stay private" />
        <p className="institution-prose">If a submission system is introduced, contact and delivery details are intended for the TAMED editorial team to assess and communicate about work, editorial feedback, publication, and selected physical gifts. These details are not part of a public author profile and must not be published.</p>
      </section>
      <section className="legal-section legal-final">
        <SectionTitle eyebrow="04 / Anonymous publication" title="The work may appear without your name" />
        <p className="institution-prose">Writers may request publication under their real name, a pen name, or anonymously. Choosing anonymous publication means TAMED will not display the writer&apos;s identity with the published work. Contact information, if later collected, remains separate from that public choice.</p>
      </section>
    </main>
  );
}