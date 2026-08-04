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
export function fileToSmallDataUrl(file: File, max = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Couldn't process that image"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
