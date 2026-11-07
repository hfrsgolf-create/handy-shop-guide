import type { Item, StoreId } from "@/lib/shop-store";

export type FavCsvRow = {
  name: string;
  store: string; // store display name, "Any Store" for flexible items
  locked: boolean;
  notes: string;
};

const HEADERS = ["name", "store", "locked", "notes"] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function favouritesToCsv(
  favs: Item[],
  storeNameById: (id: StoreId) => string,
): string {
  const lines = [HEADERS.join(",")];
  for (const f of favs) {
    const row: FavCsvRow = {
      name: f.name,
      store: f.preferredStore === "any" ? "Any Store" : storeNameById(f.preferredStore),
      locked: f.isLocked,
      notes: f.notes ?? "",
    };
    lines.push(
      [row.name, row.store, row.locked ? "yes" : "no", row.notes].map(csvEscape).join(","),
    );
  }
  return lines.join("\r\n");
}

/** Minimal RFC-4180-style CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // skip completely empty trailing lines
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  pushRow();
  return rows;
}

export type ParsedFavourite = {
  name: string;
  storeName: string;
  locked: boolean;
  notes: string;
};

/**
 * Parse favourites CSV text into rows. Tolerates a header row, missing
 * columns, and both "yes/no" and "true/false" for the locked column.
 */
export function csvToFavourites(text: string): ParsedFavourite[] {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0) return [];

  let start = 0;
  const first = rows[0]!.map((c) => c.trim().toLowerCase());
  if (first[0] === "name") start = 1;

  const out: ParsedFavourite[] = [];
  for (let r = start; r < rows.length; r++) {
    const cols = rows[r]!;
    const name = (cols[0] ?? "").trim();
    if (!name) continue;
    const storeName = (cols[1] ?? "").trim() || "Any Store";
    const lockedRaw = (cols[2] ?? "").trim().toLowerCase();
    const locked = lockedRaw === "yes" || lockedRaw === "true" || lockedRaw === "1";
    const notes = (cols[3] ?? "").trim();
    out.push({ name, storeName, locked, notes });
  }
  return out;
}
