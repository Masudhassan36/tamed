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
const logoUrl = siteUrl ? new URL("/images/tamed-logo-social.png", siteUrl).toString() : undefined;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "TAMEDT | Literary Journal",
    template: "%s | TAMEDT",
  },
  description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
  openGraph: {
    title: "TAMEDT | Literary Journal",
    description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
    siteName: "TAMEDT",
    type: "website",
    images: logoUrl ? [{ url: logoUrl, alt: "TAMEDT wordmark" }] : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "TAMEDT | Literary Journal",
    description: "A literary journal for voices, ideas, and stories that refuse to remain silent.",
    images: logoUrl ? [logoUrl] : undefined,
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