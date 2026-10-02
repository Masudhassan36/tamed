type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  number?: string;
};

export default function SectionTitle({ eyebrow, title, description, number }: SectionTitleProps) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {number && <span className="section-number">{number}</span>}
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}