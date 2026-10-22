import Link from "next/link";
import type { EditorialCategory } from "@/lib/content";

type TenCardProps = {
  field: EditorialCategory;
};

export default function TenCard({ field }: TenCardProps) {
  return (
    <Link className="ten-row" href={`/the-ten/${field.slug}`}>
      <span className="ten-number">{field.number ?? "—"}</span>
      <span className="ten-name">{field.title}</span>
      <span className="ten-description">{field.description}</span>
      <span className="ten-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
