import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Your Work",
  description: "Submit original writing to TAMED™, with options for real-name, pen-name, or anonymous publication.",
};

export default function SubmitLayout({ children }: LayoutProps<"/submit">) {
  return children;
}