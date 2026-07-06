// Store logo system — consistent 36px container used everywhere a shop appears.
// Uses inline SVG monograms so no binary assets are needed and rendering is instant.

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

type LogoSpec = {
  key: StoreKey;
  label: string; // short monogram
  bg: string; // brand background
  fg: string; // text/mark color
  isLight: boolean; // treat as light logo (needs dark container)
};

const LOGO_MAP: Record<StoreKey, LogoSpec> = {
  asda:            { key: "asda",            label: "Asda",   bg: "#7DC242", fg: "#ffffff", isLight: false },
  costco:          { key: "costco",          label: "Costco", bg: "#E31837", fg: "#005DAA",  isLight: false },
  morrisons:       { key: "morrisons",       label: "Morrisons", bg: "#00833E", fg: "#FFD400", isLight: false },
  lidl:            { key: "lidl",            label: "Lidl",   bg: "#FFF200", fg: "#0050AA", isLight: true  },
  aldi:            { key: "aldi",            label: "Aldi",   bg: "#00549A", fg: "#F5B000",  isLight: false },
  sainsburys:      { key: "sainsburys",      label: "Sainsbury's", bg: "#F06C00", fg: "#ffffff", isLight: false },
  tesco:           { key: "tesco",           label: "Tesco",  bg: "#00539F", fg: "#ffffff", isLight: false },
  marksandspencer: { key: "marksandspencer", label: "M&S",    bg: "#000000", fg: "#ffffff", isLight: true  },
  default:         { key: "default",         label: "Shop",   bg: "#f2f2f2", fg: "#888888",   isLight: false },
};

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

export function getLogoSpec(storeName: string | null | undefined): LogoSpec {
  return LOGO_MAP[getStoreKey(storeName)];
}

// Tiny monogram — first 1-2 letters of the label.
function monogram(label: string): string {
  const cleaned = label.replace(/[^A-Za-z&]/g, "");
  if (label === "M&S") return "M&S";
  if (cleaned.length <= 2) return cleaned.toUpperCase();
  return cleaned.slice(0, 1).toUpperCase();
}

export type StoreLogoProps = {
  storeName?: string | null;
  /** Override the pixel size of the container. Defaults to 36. */
  size?: number;
  className?: string;
};

/** Consistent 36×36 logo container used across shop tabs, favourites & lists. */
export function StoreLogo({ storeName, size = 36, className }: StoreLogoProps) {
  const spec = getLogoSpec(storeName);
  const isDefault = spec.key === "default";
  const containerBg = isDefault ? "#f2f2f2" : spec.isLight ? "#1f1f1f" : "#ffffff";
  const padding = spec.isLight ? 6 : 4;

  const label = storeName || spec.label;
  const mark = monogram(spec.label);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-150 ease-out active:scale-95 animate-in fade-in duration-200 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: containerBg,
        border: "1px solid rgba(0,0,0,0.05)",
        padding,
      }}
      role="img"
      aria-label={`${label} logo`}
    >
      {isDefault ? (
        <svg viewBox="0 0 24 24" fill="none" width="70%" height="70%" aria-hidden="true">
          <path
            d="M4 8h16l-1.2 10.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Zm4 0V6a4 4 0 0 1 8 0v2"
            stroke="#888"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: spec.bg,
            color: spec.fg,
            borderRadius: 4,
            fontWeight: 800,
            fontSize: mark.length > 2 ? size * 0.28 : size * 0.42,
            letterSpacing: mark.length > 2 ? "-0.02em" : 0,
            lineHeight: 1,
          }}
        >
          {mark}
        </span>
      )}
    </span>
  );
}
