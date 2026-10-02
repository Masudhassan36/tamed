import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the TAMED™ editors at tamed@bcwo.org.",
};

export default function ContactPage() {
  return (
    <main className="contact-page page-width">
      <header className="institution-header">
        <p className="eyebrow">Correspondence</p>
        <h1>Contact</h1>
        <p>For questions about the journal, submissions, or publication, write to the editors.</p>
      </header>
      <section className="contact-list" aria-label="Contact details">
        <div className="contact-row">
          <span className="eyebrow">Email</span>
          <Link href="mailto:tamed@bcwo.org">tamed@bcwo.org</Link>
        </div>
        <div className="contact-row">
          <span className="eyebrow">Instagram</span>
          <span>Coming soon</span>
        </div>
        <div className="contact-row">
          <span className="eyebrow">Facebook</span>
          <span>Coming soon</span>
        </div>
      </section>
    </main>
  );
}