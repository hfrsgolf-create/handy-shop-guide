// Store logo system — real brand wordmarks rendered as inline SVG so they
// load locally, cache instantly, and never cause layout shift.

import type { CSSProperties, ReactNode } from "react";

export type StoreKey =
  | "asda"
  | "costco"
  | "morrisons"
  | "lidl"
  | "aldi"
  | "sainsburys"
  | "tesco"
  | "marksandspencer"
  | "default";

/** Normalize + smart-match a free-text shop name to a known brand key. */
export function getStoreKey(storeName: string | null | undefined): StoreKey {
  if (!storeName) return "default";
  const name = String(storeName).toLowerCase().replace(/[^a-z]/g, "");
  if (!name) return "default";
  if (name.includes("asda")) return "asda";
  if (name.includes("costco")) return "costco";
  if (name.includes("morrison")) return "morrisons";
  if (name.includes("lidl")) return "lidl";
  if (name.includes("aldi")) return "aldi";
  if (name.includes("sainsbury")) return "sainsburys";
  if (name.includes("tesco")) return "tesco";
  if (name.includes("marks") || name.includes("mands") || name === "ms") return "marksandspencer";
  return "default";
}

type BrandMark = {
  render: () => ReactNode;
  /** true when the logo is mostly white/very light and needs a dark tile. */
  isLight: boolean;
};

// Each mark uses a 100×100 viewBox and preserveAspectRatio="xMidYMid meet"
// so object-fit: contain semantics apply naturally inside the tile.
const wordmark = (
  text: string,
  color: string,
  opts: { bg?: string; italic?: boolean; weight?: number; fontSize?: number } = {},
) => (
  <svg
    viewBox="0 0 100 40"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    {opts.bg && <rect width="100" height="40" rx="4" fill={opts.bg} />}
    <text
      x="50"
      y="27"
      textAnchor="middle"
      fill={color}
      fontFamily="'Helvetica Neue', Arial, sans-serif"
      fontWeight={opts.weight ?? 800}
      fontStyle={opts.italic ? "italic" : "normal"}
      fontSize={opts.fontSize ?? 20}
      letterSpacing="-0.5"
    >
      {text}
    </text>
  </svg>
);

const MARKS: Record<Exclude<StoreKey, "default">, BrandMark> = {
  tesco: {
    isLight: false,
    render: () => wordmark("TESCO", "#00539F", { italic: true, fontSize: 22 }),
  },
  sainsburys: {
    isLight: false,
    render: () => wordmark("Sainsbury's", "#F06C00", { fontSize: 14 }),
  },
  asda: {
    isLight: false,
    render: () => wordmark("ASDA", "#7DC242", { fontSize: 22 }),
  },
  morrisons: {
    isLight: false,
    render: () => wordmark("Morrisons", "#00833E", { fontSize: 14 }),
  },
  lidl: {
    isLight: false,
    render: () => (
      <svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect width="40" height="40" rx="3" fill="#0050AA" />
        <rect x="2" y="2" width="36" height="36" rx="2" fill="#FFF200" />
        <text
          x="20"
          y="27"
          textAnchor="middle"
          fill="#E60012"
          fontFamily="'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="16"
          fontStyle="italic"
        >
          Lidl
        </text>
      </svg>
    ),
  },
  aldi: {
    isLight: false,
    render: () => (
      <svg viewBox="0 0 100 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <text
          x="50"
          y="27"
          textAnchor="middle"
          fontFamily="'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="22"
          letterSpacing="-0.5"
        >
          <tspan fill="#00549A">AL</tspan>
          <tspan fill="#F5B000">DI</tspan>
        </text>
      </svg>
    ),
  },
  costco: {
    isLight: false,
    render: () => (
      <svg viewBox="0 0 100 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <text
          x="50"
          y="27"
          textAnchor="middle"
          fontFamily="'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="20"
          letterSpacing="-0.5"
        >
          <tspan fill="#005DAA">CO</tspan>
          <tspan fill="#E31837">ST</tspan>
          <tspan fill="#005DAA">CO</tspan>
        </text>
      </svg>
    ),
  },
  marksandspencer: {
    isLight: true,
    render: () => wordmark("M&S", "#ffffff", { fontSize: 22 }),
  },
};

export type StoreLogoProps = {
  storeName?: string | null;
  size?: number; // pixel size of the tile
  className?: string;
  style?: CSSProperties;
};

/** Consistent logo tile used across shop tabs, favourites & lists. */
export function StoreLogo({ storeName, size = 44, className, style }: StoreLogoProps) {
  const key = getStoreKey(storeName);
  const mark = key === "default" ? null : MARKS[key];
  const isLight = mark?.isLight ?? false;

  // Fallback tile — initial on soft grey, matches the "old style".
  if (!mark) {
    const letter = (storeName || "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.97] animate-in fade-in ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "#f2f2f2",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 6,
          color: "#888",
          fontWeight: 800,
          fontSize: size * 0.42,
          lineHeight: 1,
          ...style,
        }}
        role="img"
        aria-label={`${storeName ?? "Shop"} logo`}
      >
        {letter}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.97] animate-in fade-in ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: isLight ? "#1f1f1f" : "#ffffff",
        border: "1px solid rgba(0,0,0,0.06)",
        padding: 6,
        ...style,
      }}
      role="img"
      aria-label={`${storeName ?? key} logo`}
    >
      {mark.render()}
    </span>
  );
}
