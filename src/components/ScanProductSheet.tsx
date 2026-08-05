import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine, Loader2, Check } from "lucide-react";
import { ProductImageBox } from "@/components/ProductImageBox";
import {
  getBarcodeDetector,
  isScanSupported,
  lookupBarcode,
  type ScannedProduct,
} from "@/lib/barcode-scan";


export type ScanResult = { brand: string; product: string; image: string; barcode: string };

/**
 * Camera barcode scanner with product lookup.
 * Falls back to manual barcode entry / manual name + optional image upload.
 */
export function ScanProductSheet({
  onClose,
  onUse,
}: {
  onClose: () => void;
  onUse: (r: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const supported = isScanSupported();
  const [mode, setMode] = useState<"camera" | "manual" | "result">(supported ? "camera" : "manual");
  const [camError, setCamError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [found, setFound] = useState<ScannedProduct | null>(null);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [image, setImage] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleBarcode = useCallback(
    async (code: string) => {
      stopCamera();
      setLooking(true);
      const res = await lookupBarcode(code);
      setFound(res);
      setBarcode(res.barcode || code);
      setBrand(res.brand ?? "");
      setProduct(res.product ?? "");
      setImage(res.image ?? "");
      setLooking(false);
      setMode("result");
    },
    [stopCamera],
  );

  // Camera + detection loop
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    const detector = getBarcodeDetector();

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const tick = async () => {
          if (cancelled || !detector || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              const raw = codes?.[0]?.rawValue;
              if (raw) {
                await handleBarcode(raw);
                return;
              }
            }
          } catch {
            /* transient detect errors are ignored */
          }
          rafRef.current = requestAnimationFrame(() => void tick());
        };
        rafRef.current = requestAnimationFrame(() => void tick());
      } catch {
        if (!cancelled) {
          setCamError("Camera unavailable — enter the barcode or details manually.");
          setMode("manual");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, handleBarcode, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);


  const close = () => {
    stopCamera();
    onClose();
  };

  const canUse = (brand.trim() + product.trim()).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 backdrop-blur-[2px] p-3">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scan product</h3>
          <button onClick={close} aria-label="Close" className="rounded-full bg-secondary p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "camera" && (
          <div className="mt-4">
            <div className="relative overflow-hidden rounded-3xl bg-foreground/90 aspect-[4/3]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-background/80" />
              <ScanLine className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-background/80" />
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Point the camera at the product barcode.
            </p>
            <button
              onClick={() => {
                stopCamera();
                setMode("manual");
              }}
              className="mt-3 w-full rounded-full bg-secondary py-3 text-sm font-medium"
            >
              Enter manually
            </button>
          </div>
        )}

        {mode === "manual" && (
          <div className="mt-4 space-y-3">
            {(camError || !supported) && (
              <p className="text-sm text-muted-foreground">
                {camError ?? "Scanning isn't supported on this device — enter details manually."}
              </p>
            )}
            <label className="block text-xs font-medium text-muted-foreground">Barcode</label>
            <div className="flex gap-2">
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 5000157024671"
                className="min-w-0 flex-1 rounded-2xl bg-secondary px-4 py-3 text-sm outline-none"
              />
              <button
                onClick={() => barcode.trim() && handleBarcode(barcode.trim())}
                disabled={!barcode.trim() || looking}
                className="rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
              </button>
            </div>
            <button
              onClick={() => setMode("result")}
              className="w-full rounded-full bg-secondary py-3 text-sm font-medium"
            >
              Skip — type the product
            </button>
            {supported && (
              <button
                onClick={() => {
                  setCamError(null);
                  setMode("camera");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-medium text-primary"
              >
                <Camera className="h-4 w-4" />
                Try scanning again
              </button>
            )}
          </div>
        )}

        {mode === "result" && (
          <div className="mt-4 space-y-3">
            {found && !found.product && (
              <p className="text-sm text-muted-foreground">
                We couldn't identify that barcode — add the details yourself.
              </p>
            )}

            <ProductImageBox
              image={image}
              loading={looking}
              alt={product || "Product"}
              onCapture={(url) => setImage(url)}
            />

            <div>
              <label className="block text-xs font-medium text-muted-foreground">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Heinz"
                className="mt-1 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Product</label>
              <input
                value={product}
                autoFocus
                onFocus={(e) => {
                  const end = e.currentTarget.value.length;
                  e.currentTarget.setSelectionRange(end, end);
                }}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Baked Beans"
                className="mt-1 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none"
              />
            </div>

            <button
              onClick={() =>
                onUse({ brand: brand.trim(), product: product.trim(), image, barcode })
              }
              disabled={!canUse}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Use these details
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
