"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  Square,
  SquareCheck,
  Trash,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { ModalPortal } from "@/components/shared/ModalPortal";

export type SwipeLightboxImage = {
  id: string;
  imageUrl: string;
};

export type SwipeLightboxProps = {
  images: SwipeLightboxImage[];
  startIndex: number;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;

  // Optional action slots — omitted callbacks = button not rendered
  onDownload?: (image: SwipeLightboxImage) => void | Promise<void>;
  onToggleFavorite?: (id: string) => void;
  favoriteIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
  selectedIds?: ReadonlySet<string>;

  // On-screen prev/next chevrons. Default: true.
  showArrows?: boolean;
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

export function SwipeLightbox({
  images,
  startIndex,
  onClose,
  onDelete,
  onDownload,
  onToggleFavorite,
  favoriteIds,
  onToggleSelect,
  selectedIds,
  showArrows = true,
}: SwipeLightboxProps) {
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

  const isFavorited = favoriteIds?.has(current.id) ?? false;
  const isSelected = selectedIds?.has(current.id) ?? false;
  const isFirst = index === 0;
  const isLast = index === images.length - 1;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] bg-black/95"
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

      {/* Top-left action toolbar: only renders buttons whose callbacks exist */}
      {(onDownload || onToggleFavorite || onToggleSelect) && (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          {onDownload && (
            <Button
              size="icon"
              className="bg-white/90 hover:bg-white text-black"
              onClick={() => onDownload(current)}
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {onToggleFavorite && (
            <Button
              size="icon"
              className="bg-white/90 hover:bg-white text-black"
              onClick={() => onToggleFavorite(current.id)}
              aria-label={isFavorited ? "Unfavorite" : "Favorite"}
            >
              <Heart
                className={`h-5 w-5 ${isFavorited ? "fill-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary))]" : ""}`}
              />
            </Button>
          )}
          {onToggleSelect && (
            <Button
              size="icon"
              className={
                isSelected
                  ? "bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] hover:bg-[hsl(var(--lp-primary))]/90"
                  : "bg-white/90 hover:bg-white text-black"
              }
              onClick={() => onToggleSelect(current.id)}
              aria-label={isSelected ? "Deselect" : "Select"}
            >
              {isSelected ? <SquareCheck className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            </Button>
          )}
        </div>
      )}

      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-black"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      {showArrows && (
        <>
          <Button
            size="icon"
            disabled={isFirst}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-black disabled:opacity-0 disabled:pointer-events-none"
            onClick={() => {
              emblaApi?.scrollPrev();
              setIndex((i) => Math.max(i - 1, 0));
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            disabled={isLast}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-black disabled:opacity-0 disabled:pointer-events-none"
            onClick={() => {
              emblaApi?.scrollNext();
              setIndex((i) => Math.min(i + 1, images.length - 1));
            }}
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

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
    </ModalPortal>
  );
}
