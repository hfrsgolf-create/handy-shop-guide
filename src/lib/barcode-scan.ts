/**
 * Barcode scanning + product lookup helpers.
 *
 * Scanning uses the native BarcodeDetector API (available in Chrome/Android and
 * modern Chromium browsers). When it's missing we fall back to manual barcode entry.
 * Product identification uses the Open Food Facts public API (no key required).
 */

export type ScannedProduct = {
  barcode: string;
  brand?: string;
  product?: string;
  image?: string;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

export function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: BARCODE_FORMATS });
  } catch {
    try {
      return new Ctor();
    } catch {
      return null;
    }
  }
}

export const isScanSupported = () => getBarcodeDetector() !== null;

/** Looks a barcode up on Open Food Facts. Returns name/brand/image when known. */
export async function lookupBarcode(barcode: string): Promise<ScannedProduct> {
  const code = barcode.replace(/\D/g, "");
  const empty: ScannedProduct = { barcode: code };
  if (!code) return empty;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,image_front_small_url,image_small_url,image_url`,
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        image_front_small_url?: string;
        image_small_url?: string;
        image_url?: string;
      };
    };
    if (json.status !== 1 || !json.product) return empty;
    const p = json.product;
    return {
      barcode: code,
      brand: (p.brands ?? "").split(",")[0]?.trim() || undefined,
      product: p.product_name?.trim() || undefined,
      // prefer the small variants — keeps list rendering fast
      image: p.image_front_small_url || p.image_small_url || p.image_url || undefined,
    };
  } catch {
    return empty;
  }
}

/**
 * Reads a picked file and returns a small, square-ish JPEG data URL.
 * Keeps stored images tiny so lists stay fast.
 */
function drawToDataUrl(src: CanvasImageSource, w0: number, h0: number, max: number): string {
  const scale = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image");
  ctx.drawImage(src, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.75);
}

/**
 * Reads a picked/captured file and returns a small square-ish JPEG data URL.
 * Tries an <img> decode first, then createImageBitmap (handles HEIC/large camera
 * captures on some devices). Throws when nothing can be decoded.
 */
export async function fileToSmallDataUrl(file: File, max = 200): Promise<string> {
  // Read the bytes FIRST: on iOS the underlying blob can become unreadable once
  // the file input is reset or the page re-renders after a camera capture.
  const raw = await readFileAsDataUrl(file);
  return (await shrinkDataUrl(raw, max)) ?? raw;
}

/** Reads a File/Blob into a base64 data URL. Never throws silently. */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = typeof reader.result === "string" ? reader.result : "";
      if (out.length < 32) reject(new Error("empty image data"));
      else resolve(out);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onabort = () => reject(new Error("read aborted"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales a data URL to a small JPEG. Returns null when the browser can't
 * decode it (e.g. HEIC) so callers can fall back to the original bytes.
 */
export async function shrinkDataUrl(dataUrl: string, max = 480): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = dataUrl;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return null;
    return drawToDataUrl(img, w0, h0, max);
  } catch (e) {
    console.warn("[image] downscale skipped, keeping original", e);
    return null;
  }
}

