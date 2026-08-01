// Store logo system — real brand logos loaded from a CDN with an automatic
// coloured-tile fallback for custom/user-created stores or broken images.

import { useEffect, useState, type CSSProperties } from "react";

export const DEFAULT_SHOP_COLOR = "#94a3b8";

export type StoreKey =
  | "sainsburys"
  | "tesco"
  | "aldi"
  | "lidl"
  | "costco"
  | "marksandspencer"
  | "coop"
  | "asda"
  | "waitrose"
  | "morrisons";

export const storeLogos: Partial<Record<StoreKey, string>> = {
  sainsburys: "https://i.ibb.co/5WD8YTkf/file-00000000cdd081f4a27d05abdd8560ae.png",
  tesco: "https://i.ibb.co/gbXgk741/file-00000000f74481f483c09cf9290675a3.png",
  aldi: "https://i.ibb.co/tMnTx9bZ/file-00000000998481f4a8443f41137f8c83.png",
  lidl: "https://i.ibb.co/Cs0t1j4g/file-0000000052cc81f4982c886b4c160789.png",
  costco: "https://i.ibb.co/1YwHm8vd/file-000000004eac820abad157c520360b09.png",
  marksandspencer: "https://i.ibb.co/Z6LkBVTh/file-000000007ba881f4a65dd985399e2ffd.png",
  coop: "https://i.ibb.co/KjjvYYfc/file-00000000378481f4988a00f9ded3cab8.png",
  asda: "https://i.ibb.co/qMgFMvZW/file-00000000755881f4b2df982a9e1eb899.png",
  waitrose: "https://i.ibb.co/wNvBxwqg/file-00000000eb348243afef256e86a2f1e0.png",
};

/** Official-ish brand colours used for card tints & fallback tiles. */
export const storeColors: Record<StoreKey, string> = {
  tesco: "#EB001B",
  sainsburys: "#FF7F00",
  aldi: "#1C3F94",
  lidl: "#0050AA",
  costco: "#E31837",
  marksandspencer: "#1A1A1A",
  coop: "#00B5E2",
  asda: "#78BE20",
  waitrose: "#6AB023",
  morrisons: "#007A3E",
};

/**
 * Resolve the colour used for a shop card. Branded stores always use their
 * official colour; custom (user-created) shops use their saved colour.
 */
export function brandColor(
  id: string | null | undefined,
  name: string | null | undefined,
  saved?: string | null,
): string {
  const key = getStoreKey(id) ?? getStoreKey(name);
  if (key && storeColors[key]) return storeColors[key];
  return saved || DEFAULT_SHOP_COLOR;
}

/** rgba() tint from a hex colour. */
export function tint(hex: string, alpha: number): string {
  const h = (hex || DEFAULT_SHOP_COLOR).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Normalise a store id or free-text name to a canonical store key. */
export function getStoreKey(input: string | null | undefined): StoreKey | null {
  if (!input) return null;
  const name = String(input).toLowerCase().replace(/[^a-z]/g, "");
  if (!name) return null;
  if (name.includes("asda")) return "asda";
  if (name.includes("costco")) return "costco";
  if (name.includes("morrison")) return "morrisons";
  if (name.includes("lidl")) return "lidl";
  if (name.includes("aldi")) return "aldi";
  if (name.includes("sainsbury")) return "sainsburys";
  if (name.includes("tesco")) return "tesco";
  if (name.includes("waitrose")) return "waitrose";
  if (name.includes("coop") || name.includes("cooperative")) return "coop";
  if (name.includes("marks") || name.includes("mands") || name === "ms") return "marksandspencer";
  return null;
}

export function storeLogoUrl(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const key = getStoreKey(c);
    if (key && storeLogos[key]) return storeLogos[key]!;
  }
  return null;
}

/** Auto white/black text depending on background luminance. */
export function contrastText(hex: string | null | undefined): string {
  const h = (hex ?? DEFAULT_SHOP_COLOR).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#111111" : "#ffffff";
}

export function storeInitials(name: string | null | undefined): string {
  const parts = String(name ?? "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type StoreLogoProps = {
  storeName?: string | null;
  storeId?: string | null;
  color?: string | null;
  size?: number;
  /** Container corner radius — pass "50%" for a circle. */
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
};

/** Consistent logo tile used across shop tabs, favourites, lists & selectors. */
export function StoreLogo({
  storeName,
  storeId,
  color,
  size = 44,
  radius = 12,
  className,
  style,
}: StoreLogoProps) {
  const url = storeLogoUrl(storeId, storeName);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [url]);

  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    border: "1px solid rgba(0,0,0,0.06)",
    ...style,
  };

  if (!url || failed) {
    const bg = color || DEFAULT_SHOP_COLOR;
    return (
      <span
        role="img"
        aria-label={`${storeName ?? "Shop"} logo`}
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.97] ${className ?? ""}`}
        style={{
          ...base,
          background: bg,
          color: contrastText(bg),
          fontWeight: 800,
          fontSize: size * 0.34,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {storeInitials(storeName)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-150 ease-out active:scale-[0.97] ${className ?? ""}`}
      style={{ ...base, background: "#ffffff", padding: Math.round(size * 0.16) }}
      role="img"
      aria-label={`${storeName ?? "Shop"} logo`}
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
    </span>
  );
}

export type StoreCardProps = {
  name: string;
  id?: string | null;
  color?: string | null;
  /** Secondary line, e.g. "12 items". */
  subtitle?: React.ReactNode;
  selected?: boolean;
  showChevron?: boolean;
  onClick?: () => void;
  /** Right-hand slot (e.g. reorder / edit controls) — replaces the chevron. */
  trailing?: React.ReactNode;
  /** Override the logo tile (e.g. "All stores" star). */
  leading?: React.ReactNode;
  className?: string;
};

/**
 * Google Wallet-style shop card. Single source of truth for how a shop looks
 * anywhere in the app: logo circle + name/count stack + chevron on a subtly
 * brand-tinted rounded card.
 */
export function StoreCard({
  name,
  id,
  color,
  subtitle,
  selected,
  showChevron = true,
  onClick,
  trailing,
  leading,
  className,
}: StoreCardProps) {
  const accent = brandColor(id, name, color);
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": !!selected } : {})}
      title={name}
      style={{
        minHeight: 88,
        borderRadius: 18,
        background: `linear-gradient(180deg, ${tint(accent, 0.1)}, ${tint(accent, 0.055)})`,
        boxShadow: selected
          ? `0 6px 18px ${tint(accent, 0.22)}`
          : "0 1px 3px rgba(16, 24, 40, 0.06)",
        borderColor: selected ? tint(accent, 0.55) : tint(accent, 0.14),
      }}
      className={`flex w-full items-center gap-4 border p-4 text-left transition-[transform,box-shadow] duration-100 ease-out hover:shadow-[0_8px_20px_rgba(16,24,40,0.10)] ${
        onClick ? "active:scale-[0.975]" : ""
      } ${className ?? ""}`}
    >
      {leading ?? (
        <StoreLogo
          storeId={id}
          storeName={name}
          color={accent}
          size={54}
          radius="50%"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 1px 2px rgba(16,24,40,0.08)",
          }}
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold leading-tight tracking-tight text-foreground">
          {name}
        </span>
        {subtitle !== undefined && subtitle !== null && (
          <span className="mt-1 block truncate text-[13px] font-medium text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>

      {trailing ??
        (showChevron ? (
          <ChevronRight className="h-5 w-5 shrink-0 text-foreground/25" strokeWidth={2.25} />
        ) : null)}
    </Comp>
  );
}

export type StoreTabProps = {
  name: string;
  id?: string | null;
  color?: string | null;
  selected?: boolean;
  onClick?: () => void;
  widthCh?: number;
  className?: string;
};

/** Selection variant of the shop card (kept for existing selector call sites). */
export function StoreTab({ name, id, color, selected, onClick, className }: StoreTabProps) {
  return (
    <StoreCard
      name={name}
      id={id}
      color={color}
      selected={selected}
      onClick={onClick}
      showChevron={false}
      trailing={
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      }
      className={className}
    />
  );
}
}
