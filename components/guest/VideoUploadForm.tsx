"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import {
  uploadVideoToCloudinary,
  readVideoDuration,
  type VideoSignData,
} from "@/lib/uploadVideoToCloudinary";
import { MAX_VIDEO_DURATION_SEC } from "@/lib/video-config";

interface VideoUploadFormProps {
  videoLimit: number;
  existingVideoCount: number;
  language?: string;
  onUploaded?: () => void;
}

export function VideoUploadForm({ videoLimit, existingVideoCount, language = "sr", onUploaded }: VideoUploadFormProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const remaining = Math.max(0, videoLimit - existingVideoCount);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick of same file
    if (!file) return;
    setError("");

    try {
      const duration = await readVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION_SEC) {
        setError(t("guest.videoUpload.tooLong", `Video može trajati najviše ${MAX_VIDEO_DURATION_SEC} sekundi.`));
        return;
      }

      setBusy(true);
      setProgress(0);

      // 1) signature (CSRF handled by fetchWithCsrfRetry against the same endpoint)
      const signRes = await fetchWithCsrfRetry("/api/guest/upload/video-sign", {
        method: "POST",
        csrfEndpoint: "/api/guest/upload/video-sign",
      });
      const signData = (await signRes.json()) as VideoSignData & { error?: string };
      if (!signRes.ok) throw new Error(signData.error || "Greška pri pripremi upload-a.");

      // 2) direct upload to Cloudinary
      const { publicId } = await uploadVideoToCloudinary(file, signData, setProgress);

      // 3) confirm + persist
      const confirmRes = await fetchWithCsrfRetry("/api/guest/upload/video-confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId }),
        csrfEndpoint: "/api/guest/upload/video-sign",
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) throw new Error((confirmData as { error?: string }).error || "Greška pri potvrdi videa.");

      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri uploadu videa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{t("guest.videoUpload.title", "Dodaj video")}</CardTitle>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
          {t("guest.videoUpload.hint", `Do ${videoLimit} videa, max ${MAX_VIDEO_DURATION_SEC}s. Preostalo: ${remaining}.`)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <label
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 text-center transition-colors ${
            busy || remaining <= 0
              ? "opacity-50 cursor-not-allowed border-[hsl(var(--lp-muted-foreground))]/20"
              : "cursor-pointer border-[hsl(var(--lp-muted-foreground))]/20 hover:border-[hsl(var(--lp-primary))]/50"
          }`}
        >
          <Video className="h-10 w-10 text-[hsl(var(--lp-muted-foreground))]" />
          <span className="text-sm text-[hsl(var(--lp-muted-foreground))]">
            {remaining <= 0
              ? t("guest.videoUpload.maxReached", "Dostigli ste maksimalan broj videa.")
              : t("guest.videoUpload.pick", "Izaberite video")}
          </span>
          <input
            type="file"
            accept="video/*"
            onChange={onPick}
            disabled={busy || remaining <= 0}
            className="hidden"
            aria-label={t("guest.videoUpload.pick", "Izaberite video")}
          />
        </label>
        {busy && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("guest.videoUpload.uploading", "Slanje videa...")} {progress}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
