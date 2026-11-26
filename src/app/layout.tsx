import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/Geist.ttf",
  weight: "100 900",
  variable: "--font-geist-sans",
  display: "swap",
});
const readingSerif = localFont({
  src: [
    { path: "./fonts/SourceSerif4-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/SourceSerif4-Italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/SourceSerif4-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-reading-serif",
  display: "swap",
});
const bengaliSerif = localFont({
  src: "./fonts/NotoSerifBengali.ttf",
  weight: "100 900",
  variable: "--font-reading-bengali",
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const logoUrl = siteUrl ? new URL("/images/tamed-logo-social.png", siteUrl).toString() : undefined;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "TAMED™ | Literary Journal",
    template: "%s | TAMED™",
  },
  description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
  openGraph: {
    title: "TAMED™ | Literary Journal",
    description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
    siteName: "TAMED™",
    type: "website",
    images: logoUrl ? [{ url: logoUrl, alt: "TAMED™ wordmark" }] : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "TAMED™ | Literary Journal",
    description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
    images: logoUrl ? [logoUrl] : undefined,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${readingSerif.variable} ${bengaliSerif.variable}`}>
      <body id="top">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
