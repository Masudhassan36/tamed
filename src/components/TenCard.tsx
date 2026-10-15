import Link from "next/link";
import type { EditorialField } from "@/lib/content";

type TenCardProps = {
  field: EditorialField;
};

export default function TenCard({ field }: TenCardProps) {
  const subsections = field.subsections ?? [];

  return (
    <Link className="ten-row" href={`/the-ten/${field.slug}`}>
      <span className="ten-number">{field.number}</span>
      <span className="ten-name">{field.title}</span>
      <span className="ten-description">
        <span className="ten-description-line">{field.description}</span>
        {subsections.length > 0 && (
          <span className="ten-subsections">
            {subsections.map((subsection) => (
              <span className="ten-subsection" key={subsection.slug}>
                {field.title} — {subsection.title}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="ten-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
