import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo imageSrc="/images/tamed-wordmark.svg" imageWidth={1200} imageHeight={280} />
          <p>Published by BCWO</p>
        </div>
        <a href="mailto:tamed@bcwo.org">tamed@bcwo.org</a>
        <div className="footer-social" aria-label="Social media">
          <span>Instagram</span>
          <span>Facebook</span>
        </div>
        <Link className="back-to-top" href="#top">Back to top ↑</Link>
      </div>
      <div className="footer-bottom">
        <p className="footer-imprint">Bangladesh Creative Writing Olympiad · An independent literary journal</p>
        <nav className="footer-legal" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}