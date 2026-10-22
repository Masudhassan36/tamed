import type { EditorialRating } from "@/lib/articles";

type RatingBadgeProps = {
  rating: EditorialRating | null;
};

const ratingDescriptions: Partial<Record<EditorialRating, string>> = {
  "5+": "Exceptional",
  "5": "Outstanding",
  "4+": "Excellent",
  "4": "Strong",
  "3+": "Promising",
  "3": "Developing",
};

export default function RatingBadge({ rating }: RatingBadgeProps) {
  if (!rating) return null;
  const description = rating ? ratingDescriptions[rating] : undefined;

  return (
    <span className="rating-badge" aria-label={`Editorial Rating: ${rating}${description ? `, ${description}` : ""}`}>
      <span className="rating-label">Editorial Rating:</span>
      <span className="rating-value" title={description ?? `Rating ${rating}`}>
        {rating}
      </span>
    </span>
  );
}