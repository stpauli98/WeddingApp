"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface AdminVideo {
  id: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
  guestName?: string;
}

export function AdminVideoGallery({ videos }: { videos: AdminVideo[] }) {
  const { t } = useTranslation();
  if (videos.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
        {t("admin.videoGallery.empty", "Nema video snimaka.")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v) => (
        <Card key={v.id} className="overflow-hidden">
          <video
            controls
            preload="metadata"
            poster={v.posterUrl || undefined}
            src={v.videoUrl}
            className="w-full"
          />
          <div className="flex items-center justify-between p-2 text-sm">
            <span className="truncate">{v.guestName ?? ""}</span>
            <a
              href={v.videoUrl}
              download
              className="inline-flex items-center gap-1 text-[hsl(var(--lp-primary))]"
              aria-label={t("admin.videoGallery.downloadFor", "Preuzmi video od {{name}}", { name: v.guestName ?? "" })}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}
