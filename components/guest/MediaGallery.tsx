"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trash, Loader2, Play, Video } from "lucide-react";
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
  readOnly?: boolean;
  onImagesChange?: (i: GalleryImage[]) => void;
  onVideosChange?: (v: GalleryVideo[]) => void;
}

export function MediaGallery({ images, videos, guestId, language = "sr", readOnly = false, onImagesChange, onVideosChange }: MediaGalleryProps) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

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
            {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); remove(item); }}
              disabled={isDeleting}
              aria-label={item.kind === "image" ? t("guest.imageGallery.deleteImage", "Obriši sliku") : t("guest.videoGallery.delete", "Obriši video")}
              className="absolute top-2 right-2 z-20 h-8 w-8 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center text-[hsl(var(--lp-destructive))]"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            </button>
          )}
            {item.kind === "image" ? (
              <ImageWithSpinner src={item.imageUrl} width={400} height={400} crop="fill" alt={t("guest.imageGallery.guestImage", "Slika gosta")} className="p-2" rounded={true} />
            ) : (
              <div className="relative w-full h-full">
                {activeVideoId === item.id ? (
                  <video
                    src={item.videoUrl}
                    poster={item.posterUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--lp-muted))]/40 flex items-center justify-center">
                        <Video className="h-10 w-10 text-white/60" />
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={t("guest.mediaGallery.playVideo", "Pusti video")}
                      onClick={() => setActiveVideoId(item.id)}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="bg-black/50 rounded-full p-3 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </span>
                    </button>
                  </>
                )}
                {/* Video badge — always visible */}
                <span className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/50 text-white rounded px-1.5 py-0.5 text-xs">
                  <Video className="h-3 w-3" />
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
