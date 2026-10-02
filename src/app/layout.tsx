import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const wordmarkUrl = siteUrl ? new URL("/images/tamed-wordmark.svg", siteUrl).toString() : undefined;

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
    images: wordmarkUrl ? [{ url: wordmarkUrl, alt: "TAMED™ wordmark" }] : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "TAMED™ | Literary Journal",
    description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
    images: wordmarkUrl ? [wordmarkUrl] : undefined,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body id="top">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}