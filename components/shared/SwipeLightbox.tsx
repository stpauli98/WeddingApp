"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { X, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

export type SwipeLightboxImage = {
  id: string;
  imageUrl: string;
};

export type SwipeLightboxProps = {
  images: SwipeLightboxImage[];
  startIndex: number;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
};

/**
 * Render the uploaded image at its natural aspect ratio, constrained to the
 * viewport. Uses a plain <img> tag because the stored Cloudinary URL already
 * has upload-time quality/format optimization applied, and CldImage's
 * transformations + ImageWithSpinner's hardcoded object-cover would crop
 * portrait photos in the viewer.
 */
function LightboxImage({ src }: { src: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-white/80" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        className="max-w-full max-h-full object-contain select-none pointer-events-none"
        style={{ visibility: loading ? "hidden" : "visible" }}
      />
    </>
  );
}

export function SwipeLightbox({ images, startIndex, onClose, onDelete }: SwipeLightboxProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    loop: false,
    containScroll: "trimSnaps",
  });
  const [index, setIndex] = useState(startIndex);
  useLockBodyScroll(true);

  // Sync index from embla scroll events.
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Collapse if underlying array empties (e.g. after delete of last image).
  useEffect(() => {
    if (images.length === 0) onClose();
  }, [images.length, onClose]);

  // Keyboard: arrows navigate, Escape closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        emblaApi?.scrollNext();
        setIndex((i) => Math.min(i + 1, images.length - 1));
      } else if (e.key === "ArrowLeft") {
        emblaApi?.scrollPrev();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [emblaApi, onClose, images.length]);

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const SWIPE_DOWN_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY;
      setTouchStartY(null);
      if (delta > SWIPE_DOWN_THRESHOLD) onClose();
    },
    [touchStartY, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const current = images.length > 0 ? images[Math.min(index, images.length - 1)] : null;

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete || !current) return;
    if (!window.confirm("Obrisati ovu sliku?")) return;
    try {
      await onDelete(current.id);
    } catch (err) {
      // Parent controls error UX; we just swallow here so the lightbox stays usable.
      console.error("[SwipeLightbox] delete failed", err);
    }
  }, [onDelete, current]);

  if (images.length === 0 || !current) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Embla viewport */}
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex w-full h-full">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative shrink-0 grow-0 basis-full flex items-center justify-center p-4"
            >
              <LightboxImage src={img.imageUrl} />
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-black"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute bottom-4 right-4 z-10 bg-white/90 hover:bg-white text-black"
          onClick={handleDeleteClick}
          aria-label="Delete"
        >
          <Trash className="h-5 w-5" />
        </Button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
