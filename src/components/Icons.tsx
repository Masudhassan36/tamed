import type { SVGProps } from "react";

/** Small, single-stroke icon set. Everything inherits `currentColor`. */
type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...strokeProps} fill="currentColor" stroke="none" {...props}>
      <path d="M13.4 21v-8.1h2.7l.4-3.1h-3.1V7.8c0-.9.25-1.5 1.6-1.5h1.6V3.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.5v3.1h2.7V21z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}
