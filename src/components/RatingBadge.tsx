import type { EditorialRating } from "@/lib/articles";

type RatingBadgeProps = {
  rating: EditorialRating | null;
};

const ratingDescriptions: Record<EditorialRating, string> = {
  "5+": "Exceptional",
  "5": "Outstanding",
  "4+": "Excellent",
  "4": "Strong",
  "3+": "Promising",
  "3": "Developing",
};

export default function RatingBadge({ rating }: RatingBadgeProps) {
  const description = rating ? ratingDescriptions[rating] : undefined;

  return (
    <span className="rating-badge" aria-label={rating ? `Editorial Rating: ${rating}, ${description ?? ""}` : "Editorial Rating: not yet assigned"}>
      <span className="rating-label">Editorial Rating:</span>
      <span className={rating ? "rating-value" : "rating-value rating-pending"} title={description ?? "Not yet assigned"}>
        {rating ?? "Not assigned"}
      </span>
    </span>
  );
}