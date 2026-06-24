"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MediaUpload, type StagedMedia } from "@/components/guest/MediaUpload";
import { UploadStatusList, type ImageUploadStatus } from "@/components/guest/UploadStatusList";
import { ModalPortal } from "@/components/shared/ModalPortal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { uploadImageFile } from "@/lib/uploadImageToServer";
import { uploadVideoFlow } from "@/lib/uploadVideoFlow";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import type { PricingTier } from "@/lib/pricing-tiers";

interface UnifiedUploadFormProps {
  guestId: string;
  message?: string;
  language?: string;
  imageLimit: number;
  videoLimit: number;
  tier: PricingTier;
  existingImageCount: number;
  existingVideoCount: number;
}

export function UnifiedUploadForm({
  guestId: _guestId,
  message: initialMessage = "",
  language = "sr",
  imageLimit,
  videoLimit,
  tier,
  existingImageCount,
  existingVideoCount,
}: UnifiedUploadFormProps) {
  const { t } = useTranslation();
  const allowVideo = videoLimit > 0;

  const [staged, setStaged] = useState<StagedMedia[]>([]);
  const [message, setMessage] = useState(initialMessage);
  const [statuses, setStatuses] = useState<ImageUploadStatus[]>([]);
  const [showStatus, setShowStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useLockBodyScroll(showStatus);

  const stagedImages = staged.filter((s) => s.kind === "image").length;
  const stagedVideos = staged.filter((s) => s.kind === "video").length;
  const imageSlotsLeft = Math.max(0, imageLimit - existingImageCount - stagedImages);
  const videoSlotsLeft = Math.max(0, videoLimit - existingVideoCount - stagedVideos);

  async function runItem(s: ImageUploadStatus): Promise<boolean> {
    const setProgress = (pct: number) =>
      setStatuses((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, status: "uploading", progress: pct, retryable: false } : x))
      );
    try {
      setProgress(0);
      if (s.kind === "video") await uploadVideoFlow(s.file, setProgress);
      else await uploadImageFile(s.file, tier, setProgress);
      setStatuses((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, status: "success", progress: 100 } : x))
      );
      return true;
    } catch (err) {
      setStatuses((prev) =>
        prev.map((x) =>
          x.id === s.id
            ? { ...x, status: "error", error: err instanceof Error ? err.message : "Greška", retryable: true }
            : x
        )
      );
      return false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (staged.length === 0) {
      setNotice(t("guest.mediaUpload.pickSomething", "Izaberite bar jednu sliku ili video."));
      return;
    }

    setIsLoading(true);
    setShowStatus(true);
    const initial: ImageUploadStatus[] = staged.map((m) => ({
      id: m.id,
      file: m.file,
      kind: m.kind,
      status: "waiting",
      progress: 0,
      preview: m.preview,
    }));
    setStatuses(initial);

    if (message.trim()) {
      const fd = new FormData();
      fd.append("message", message);
      await fetchWithCsrfRetry("/api/guest/upload", {
        method: "POST",
        body: fd,
        csrfEndpoint: "/api/guest/upload",
      }).catch(() => {});
    }

    const results = await Promise.all(initial.map((s) => runItem(s)));
    if (results.every(Boolean)) {
      setTimeout(() => {
        window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success";
      }, 1200);
    } else {
      setIsLoading(false);
    }
  }

  async function retryOne(id: string) {
    const s = statuses.find((x) => x.id === id);
    if (!s) return;
    setIsLoading(true);
    const ok = await runItem(s);
    const otherFailing = statuses.some((x) => x.id !== id && x.status === "error");
    if (ok && !otherFailing) {
      setTimeout(() => {
        window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success";
      }, 1200);
    } else {
      setIsLoading(false);
    }
  }

  async function retryAll() {
    const failed = statuses.filter((x) => x.status === "error" && x.retryable);
    if (failed.length === 0) return;
    setIsLoading(true);
    const results = await Promise.all(failed.map((s) => runItem(s)));
    if (results.every(Boolean)) {
      setTimeout(() => {
        window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success";
      }, 1200);
    } else {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      {notice && (
        <div className="p-4 border-b border-gray-200">
          <Alert variant="destructive" className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{notice}</AlertDescription>
            </div>
            <button onClick={() => setNotice("")} aria-label={t("guest.mediaUpload.dismiss", "Zatvori")}>
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      {showStatus && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b border-[hsl(var(--lp-accent))]/10">
                <h3 className="text-[hsl(var(--lp-primary))] text-lg font-semibold">
                  {t("guest.mediaUpload.uploadingTitle", "Slanje uspomena")}
                </h3>
              </div>
              <UploadStatusList
                uploadStatuses={statuses}
                isLoading={isLoading}
                onRetryUpload={retryOne}
                onRetryAllFailed={retryAll}
                language={language}
              />
            </div>
          </div>
        </ModalPortal>
      )}

      <CardHeader>
        <CardTitle>{t("guest.mediaUpload.title", "Dodaj uspomene")}</CardTitle>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
          {t(
            "guest.mediaUpload.counterImages",
            `Slike ${existingImageCount + stagedImages}/${imageLimit}`,
            { count: existingImageCount + stagedImages, limit: imageLimit }
          )}
          {allowVideo && (
            <>
              {" · "}
              {t(
                "guest.mediaUpload.counterVideos",
                `Video ${existingVideoCount + stagedVideos}/${videoLimit}`,
                { count: existingVideoCount + stagedVideos, limit: videoLimit }
              )}
            </>
          )}
        </p>
      </CardHeader>

      <form onSubmit={onSubmit} aria-busy={isLoading}>
        <CardContent className="space-y-6">
          <MediaUpload
            value={staged}
            onChange={setStaged}
            imageSlotsLeft={imageSlotsLeft}
            videoSlotsLeft={videoSlotsLeft}
            allowVideo={allowVideo}
            language={language}
            onReject={(msg) => setNotice(msg)}
          />
          <div>
            <label className="block font-medium mb-1">
              {t("guest.uploadForm.messageOptional", "Poruka (opciono)")}
            </label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(
                "guest.uploadForm.messagePlaceholder",
                "Napišite poruku ili čestitku mladencima..."
              )}
            />
            <p className="text-sm text-[hsl(var(--lp-muted-foreground))] mt-1">
              {t("guest.uploadForm.maxChars", "Maksimalno 500 karaktera")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="px-4 py-6 sm:px-6">
          <Button
            type="submit"
            className="w-full py-6 sm:py-4"
            disabled={isLoading || staged.length === 0}
          >
            {isLoading
              ? t("guest.uploadForm.sending", "Slanje...")
              : t("guest.uploadForm.confirmUpload", "Potvrdi upload")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
