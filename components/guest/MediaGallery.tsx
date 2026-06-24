"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trash, Loader2 } from "lucide-react";
import ImageWithSpinner from "@/components/shared/ImageWithSpinner";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import { useTranslation } from "react-i18next";

export interface GalleryImage { id: string; imageUrl: string; storagePath?: string; createdAt: string }
export interface GalleryVideo { id: string; videoUrl: string; posterUrl: string; durationSec: number; createdAt: string }

type MediaItem =
  | ({ kind: "image" } & GalleryImage)
  | ({ kind: "video" } & GalleryVideo);

interface MediaGalleryProps {
  images: GalleryImage[];
  videos: GalleryVideo[];
  guestId: string;
  language?: string;
  onImagesChange?: (i: GalleryImage[]) => void;
  onVideosChange?: (v: GalleryVideo[]) => void;
}

export function MediaGallery({ images, videos, guestId, language = "sr", onImagesChange, onVideosChange }: MediaGalleryProps) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const items: MediaItem[] = [
    ...images.map((i) => ({ kind: "image" as const, ...i })),
    ...videos.map((v) => ({ kind: "video" as const, ...v })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (items.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">{t("guest.mediaGallery.empty", "Nema uploadovanih uspomena")}</div>;
  }

  async function remove(item: MediaItem) {
    if (deleting.has(item.id)) return;
    setDeleting((p) => new Set(p).add(item.id));
    const endpoint = item.kind === "image" ? `/api/guest/images/delete?id=${item.id}` : `/api/guest/videos/delete?id=${item.id}`;
    const csrfEndpoint = item.kind === "image" ? "/api/guest/images/delete" : "/api/guest/videos/delete";
    try {
      const res = await fetchWithCsrfRetry(endpoint, { method: "DELETE", csrfEndpoint });
      if (res.ok || res.status === 404) {
        if (item.kind === "image") onImagesChange?.(images.filter((x) => x.id !== item.id));
        else onVideosChange?.(videos.filter((x) => x.id !== item.id));
      }
    } finally {
      setDeleting((p) => { const n = new Set(p); n.delete(item.id); return n; });
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((item) => {
        const isDeleting = deleting.has(item.id);
        return (
          <Card key={`${item.kind}-${item.id}`} className="relative aspect-square overflow-hidden group bg-white border border-[hsl(var(--lp-accent))] shadow-lg rounded-xl">
            <button
              onClick={(e) => { e.stopPropagation(); remove(item); }}
              disabled={isDeleting}
              aria-label={item.kind === "image" ? t("guest.imageGallery.deleteImage", "Obriši sliku") : t("guest.videoGallery.delete", "Obriši video")}
              className="absolute top-2 right-2 z-20 h-8 w-8 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center text-[hsl(var(--lp-destructive))]"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            </button>
            {item.kind === "image" ? (
              <ImageWithSpinner src={item.imageUrl} width={400} height={400} crop="fill" alt={t("guest.imageGallery.guestImage", "Slika gosta")} className="p-2" rounded={true} />
            ) : (
              <video controls preload="metadata" poster={item.posterUrl || undefined} src={item.videoUrl} className="w-full h-full object-cover" />
            )}
          </Card>
        );
      })}
    </div>
  );
}
