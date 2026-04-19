"use client";

import { useEffect, useState } from "react";
import { X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageWithSpinner from "@/components/shared/ImageWithSpinner";
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

export function SwipeLightbox({ images, startIndex, onClose, onDelete }: SwipeLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  useLockBodyScroll(true);

  // Keep index within bounds if the underlying array shrinks (e.g. after delete).
  useEffect(() => {
    if (index >= images.length && images.length > 0) {
      setIndex(images.length - 1);
    }
  }, [images.length, index]);

  if (images.length === 0) {
    onClose();
    return null;
  }

  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Tap on the black backdrop closes; taps on the image must not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Image viewport */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <ImageWithSpinner
          src={current.imageUrl}
          width={1600}
          height={1200}
          alt=""
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Close button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Delete button (optional) */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white"
          onClick={() => onDelete(current.id)}
          aria-label="Delete"
        >
          <Trash className="h-5 w-5" />
        </Button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
