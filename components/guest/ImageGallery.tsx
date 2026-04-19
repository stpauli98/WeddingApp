"use client"

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trash, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ImageWithSpinner from "@/components/shared/ImageWithSpinner"
import { SwipeLightbox } from "@/components/shared/SwipeLightbox";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import { useTranslation } from "react-i18next"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface ImageGalleryProps {
  images: Image[];
  guestId?: string;
  readOnly?: boolean;
  onImagesChange?: (images: Image[]) => void;
  language?: string;
}

export function ImageGallery({ images: initialImages, guestId, readOnly = false, onImagesChange, language = 'sr' }: ImageGalleryProps) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const [images, setImages] = useState<Image[]>(initialImages);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Notify parent of image list changes. Skip the initial mount so the
  // parent doesn't receive an echo of the state it already owns.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  const handleDelete = useCallback(
    async (imageId: string) => {
      if (!guestId) return;
      // Already deleting this one — ignore the duplicate click.
      if (deletingIds.has(imageId)) return;
      // Capture the image for potential rollback. If it's already gone from
      // the list (e.g. a stale lightbox reference), the click is a no-op.
      const target = images.find((img) => img.id === imageId);
      if (!target) return;

      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(imageId);
        return next;
      });
      setError(null);

      // Optimistic removal. Functional updater reads the freshest state, so
      // concurrent deletes each see the list minus everything removed so
      // far — no stale-closure "B keeps reappearing" bug.
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      const restoreOnError = () =>
        setImages((prev) => (prev.find((img) => img.id === target.id) ? prev : [...prev, target]));

      try {
        const res = await fetchWithCsrfRetry(
          `/api/guest/images/delete?id=${imageId}`,
          { method: "DELETE", csrfEndpoint: "/api/guest/images/delete" }
        );

        // 404 = already gone on the server. That matches our optimistic state,
        // so treat it as a success rather than surfacing an error.
        if (res.status === 404) return;

        let data: { success?: boolean; error?: string } | null = null;
        try {
          data = await res.json();
        } catch {
          // empty body is fine
        }

        if (!res.ok || !data?.success) {
          restoreOnError();
          setError(data?.error || "Greška pri brisanju slike.");
        }
      } catch {
        restoreOnError();
        setError("Greška pri komunikaciji sa serverom.");
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
      }
    },
    [guestId, deletingIds, images]
  );

  const openFullView = (index: number) => setLightboxIndex(index);
  const closeFullView = () => setLightboxIndex(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {t('guest.imageGallery.noImages', 'Nema uploadovanih slika')}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div
          className="mb-3 p-2 rounded-md bg-[hsl(var(--lp-destructive))]/10 text-[hsl(var(--lp-destructive))] text-sm"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((image) => {
          const isDeleting = deletingIds.has(image.id);
          return (
            <Card
              key={image.id}
              className="relative aspect-square overflow-hidden group bg-white border border-[hsl(var(--lp-accent))] shadow-lg rounded-xl transition-transform duration-200 hover:shadow-xl hover:scale-105"
            >
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-20 h-8 w-8 bg-white/90 hover:bg-white shadow-md rounded-full disabled:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  disabled={isDeleting}
                  aria-label={t('guest.imageGallery.deleteImage', 'Obriši sliku')}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--lp-destructive))]" />
                  ) : (
                    <Trash className="h-4 w-4 text-[hsl(var(--lp-destructive))]" />
                  )}
                </Button>
              )}
              <div
                className="w-full h-full cursor-pointer"
                onClick={() => openFullView(images.findIndex((img) => img.id === image.id))}
              >
                {image.imageUrl && typeof image.imageUrl === 'string' ? (
                  <ImageWithSpinner
                    src={image.imageUrl}
                    width={400}
                    height={400}
                    crop="fill"
                    alt={t('guest.imageGallery.guestImage', 'Slika gosta')}
                    className="p-2"
                    rounded={true}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-[hsl(var(--lp-destructive))]/10 text-[hsl(var(--lp-destructive))] text-center text-sm p-4">
                    {t('guest.imageGallery.imageError', 'Greška: Slika nije dostupna ili nije validan URL')}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <SwipeLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={closeFullView}
          onDelete={readOnly ? undefined : handleDelete}
        />
      )}
    </>
  )
}
