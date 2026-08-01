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
  className?: string;
  style?: CSSProperties;
};

/** Consistent logo tile used across shop tabs, favourites, lists & selectors. */
export function StoreLogo({
  storeName,
  storeId,
  color,
  size = 44,
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
    borderRadius: 12,
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

export type StoreTabProps = {
  name: string;
  id?: string | null;
  color?: string | null;
  selected?: boolean;
  onClick?: () => void;
  widthCh?: number;
  className?: string;
};

/** Logo-first shop tab used in every shop selector. */
export function StoreTab({ name, id, color, selected, onClick, widthCh, className }: StoreTabProps) {
  const url = storeLogoUrl(id, name);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bg = color || DEFAULT_SHOP_COLOR;
  const showLogo = url && !failed;

  const width = widthCh ? `min(calc(${widthCh}ch + 2.5rem), 78vw)` : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-pressed={!!selected}
      style={{
        width,
        minWidth: "6rem",
        height: 56,
        background: showLogo ? "#ffffff" : bg,
        color: showLogo ? undefined : contrastText(bg),
        boxShadow: selected ? "0 4px 12px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
        transform: selected ? "scale(1.04)" : undefined,
      }}
      className={`flex items-center justify-center overflow-hidden rounded-2xl border px-3 py-2 transition-all duration-150 ease-out active:scale-[0.97] ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-black/5"
      } ${className ?? ""}`}
    >
      {showLogo ? (
        <img
          src={url!}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            maxHeight: "100%",
            maxWidth: "100%",
            height: 34,
            objectFit: "contain",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        />
      ) : (
        <span className="truncate text-sm font-semibold">{name}</span>
      )}
    </button>
  );
}
