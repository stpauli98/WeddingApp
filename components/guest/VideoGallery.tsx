"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";

export interface GuestVideo {
  id: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
}

export function VideoGallery({
  videos,
  onDeleted,
}: {
  videos: GuestVideo[];
  onDeleted?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
        {t("guest.videoGallery.empty", "Nema uploadovanih videa.")}
      </p>
    );
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithCsrfRetry(`/api/guest/videos/delete?id=${id}`, {
        method: "DELETE",
        csrfEndpoint: "/api/guest/videos/delete",
      });
      if (res.ok) onDeleted?.(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {videos.map((v) => (
        <Card key={v.id} className="relative overflow-hidden">
          <video
            controls
            preload="metadata"
            poster={v.posterUrl}
            src={v.videoUrl}
            className="w-full rounded-md"
          />
          <button
            onClick={() => remove(v.id)}
            disabled={deletingId === v.id}
            aria-label={t("guest.videoGallery.delete", "Obriši video")}
            className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 text-gray-700 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Card>
      ))}
    </div>
  );
}
