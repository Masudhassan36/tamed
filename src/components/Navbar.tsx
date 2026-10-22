import Link from "next/link";
import Logo from "@/components/Logo";
import { FacebookIcon, InstagramIcon } from "@/components/Icons";
import { editorialCategories } from "@/lib/content";

const links = [
  { label: "Home", href: "/" },
  { label: "The Ten", href: "/the-ten" },
  { label: "Submit", href: "/submit" },
  { label: "About", href: "/about" },
  { label: "Authors", href: "/authors" },
  { label: "5+", href: "/5-plus" },
  { label: "Archive", href: "/archive" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo imageSrc="/images/tamed-wordmark.svg" imageWidth={1200} imageHeight={280} />
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="social-placeholders" aria-label="Social media">
          <span aria-label="Instagram" title="Instagram"><InstagramIcon /></span>
          <span aria-label="Facebook" title="Facebook"><FacebookIcon /></span>
        </div>
      </div>
      <nav className="category-nav" aria-label="Browse categories">
        {editorialCategories.map((category) => (
          <Link key={category.slug} href={`/the-ten/${category.slug}`}>{category.title}</Link>
        ))}
      </nav>
    </header>
  );
}
