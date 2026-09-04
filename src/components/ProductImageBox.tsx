import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { fileToSmallDataUrl } from "@/lib/barcode-scan";
import { useBackClose } from "@/lib/back-nav";

/**
 * Compact square (1:1) product image container, ~45% of the container width so
 * the product name field stays visible without scrolling.
 * - With an image: tap to open a full-screen lightbox (no URL field, no change button).
 * - Without one: tappable placeholder that opens the device camera directly.
 */
export function ProductImageBox({
  image,
  onCapture,
  loading = false,
  alt = "Product",
}: {
  image?: string;
  onCapture: (dataUrl: string) => void;
  loading?: boolean;
  alt?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  useBackClose(zoom, () => setZoom(false));

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const handleFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) {
      // user cancelled the camera
      input.value = "";
      return;
    }
    console.info("[ProductImageBox] captured file", {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    setBusy(true);
    try {
      // read bytes BEFORE resetting the input — on iOS the blob dies otherwise
      const dataUrl = await fileToSmallDataUrl(file, 480);
      if (!dataUrl || dataUrl.length < 32) throw new Error("empty image");
      console.info("[ProductImageBox] saved image", { length: dataUrl.length });
      onCapture(dataUrl);
      toast.success("Photo saved");
    } catch (e) {
      console.error("[ProductImageBox] capture failed", e);
      toast.error("Photo couldn't be saved. Please try again.");
    } finally {
      // allow re-picking the same file next time
      input.value = "";
      setBusy(false);
    }
  };

  const frame = "relative w-[45%] max-w-[220px] aspect-square rounded-3xl shadow-sm";

  if (loading) {
    return (
      <div className={`${frame} flex items-center justify-center bg-secondary`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (image) {
    return (
      <>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="View image larger"
          className={`${frame} overflow-hidden bg-secondary transition active:scale-[0.98]`}
        >
          <img
            key={image}
            src={image}
            alt={alt}
            loading="lazy"
            className="h-full w-full animate-in fade-in zoom-in-95 object-cover duration-300"
          />
        </button>

        {zoom && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/90 p-4 animate-in fade-in duration-200"
            onClick={() => setZoom(false)}
          >
            <img
              src={image}
              alt={alt}
              className="max-h-full max-w-full animate-in zoom-in-95 rounded-2xl object-contain duration-200"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="Close image"
              className="absolute right-4 top-4 rounded-full bg-card p-2 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.currentTarget)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${frame} flex flex-col items-center justify-center gap-1.5 bg-secondary px-2 text-center text-muted-foreground transition active:scale-[0.98]`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <Camera className="h-7 w-7" />
            <span className="text-xs font-medium text-foreground">No image found</span>
            <span className="text-[11px] leading-tight">Tap to take a photo</span>
          </>
        )}
      </button>
    </>
  );
}
