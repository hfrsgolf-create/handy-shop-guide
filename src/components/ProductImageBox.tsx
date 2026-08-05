import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fileToSmallDataUrl } from "@/lib/barcode-scan";

/**
 * Large square (1:1) product image container.
 * - With an image: read-only display (no URL field, no change button).
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

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      onCapture(await fileToSmallDataUrl(file, 480));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that photo");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (image) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-3xl bg-secondary">
        <img
          key={image}
          src={image}
          alt={alt}
          loading="lazy"
          className="h-full w-full animate-in fade-in zoom-in-95 object-cover duration-300"
        />
      </div>
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
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl bg-secondary text-muted-foreground transition active:scale-[0.99]"
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <Camera className="h-8 w-8" />
            <span className="text-sm font-medium text-foreground">No image found</span>
            <span className="text-xs">Tap to take a photo</span>
          </>
        )}
      </button>
    </>
  );
}
