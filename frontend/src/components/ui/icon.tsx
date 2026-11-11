import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "arrow-down"
  | "arrow-left-right"
  | "arrow-right"
  | "badge"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "compass"
  | "menu"
  | "plane"
  | "receipt"
  | "search"
  | "shield"
  | "spark"
  | "support"
  | "x";

const paths: Record<IconName, ReactNode> = {
  "arrow-down": <path d="m7 10 5 5 5-5" />,
  "arrow-left-right": (
    <>
      <path d="M17 3 21 7l-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  badge: (
    <>
      <path d="m12 3 2.2 1.6 2.7-.1.9 2.6 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-.9 2.6-2.7-.1L12 19l-2.2-1.6-2.7.1-.9-2.6-2.3-1.4.7-2.6-.7-2.6 2.3-1.4.9-2.6 2.7.1L12 3Z" />
      <path d="m9 11 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  plane: (
    <>
      <path d="m2 16 20-5-7-2-4-7-2 1 2 7-6 2-3-3-2 1 2 5Z" />
      <path d="M6 20h12" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </>
  ),
  support: (
    <>
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 13h3v6H6a2 2 0 0 1-2-2v-4ZM20 13h-3v6h1a2 2 0 0 0 2-2v-4Z" />
      <path d="M12 19h3" />
    </>
  ),
  x: <path d="m18 6-12 12M6 6l12 12" />,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
