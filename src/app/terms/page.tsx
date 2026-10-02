import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";

export const metadata: Metadata = {
  title: "Terms",
  description: "Submission, originality, editorial review, and publication terms for TAMED™.",
};

export default function TermsPage() {
  return (
    <main className="legal-page page-width">
      <header className="institution-header">
        <p className="eyebrow">TAMED™ / Submission principles</p>
        <h1>Terms</h1>
        <p>A submission should be your own work, and publication should happen with your permission.</p>
      </header>
      <section className="legal-section">
        <SectionTitle eyebrow="01 / Original work" title="The work must be yours" />
        <p className="institution-prose">By submitting, you confirm that the work is original and that you have the right to submit it. Plagiarism is not accepted. Submissions that are highly AI-generated are not accepted.</p>
      </section>
      <section className="legal-section">
        <SectionTitle eyebrow="02 / Editorial review" title="Selection remains with the editors" />
        <p className="institution-prose">TAMED reviews submissions and may request revisions before publication. Sending work does not guarantee selection or publication. The current form is a preview and does not transmit submissions.</p>
      </section>
      <section className="legal-section">
        <SectionTitle eyebrow="03 / Copyright" title="The author retains ownership" />
        <p className="institution-prose">Copyright remains with the author. By submitting, you grant TAMED permission to publish the work if selected. This permission concerns publication of the selected work; it does not transfer copyright ownership.</p>
      </section>
      <section className="legal-section legal-final">
        <SectionTitle eyebrow="04 / Credit" title="Choose how your name appears" />
        <p className="institution-prose">You may request publication under your real name, a pen name, or anonymously. TAMED will follow the selected publication preference for the public byline.</p>
      </section>
    </main>
  );
}