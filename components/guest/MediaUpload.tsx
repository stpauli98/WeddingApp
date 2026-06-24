// components/guest/MediaUpload.tsx
"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { readVideoDuration } from "@/lib/uploadVideoToCloudinary";
import { MAX_VIDEO_DURATION_SEC } from "@/lib/video-config";

export type StagedMedia = { id: string; file: File; kind: "image" | "video"; preview: string };

interface MediaUploadProps {
  value: StagedMedia[];
  onChange: (items: StagedMedia[]) => void;
  imageSlotsLeft: number;
  videoSlotsLeft: number;
  allowVideo: boolean;
  language?: string;
  onReject?: (msg: string) => void;
}

let _seq = 0;
const nextId = () => `m-${Date.now()}-${_seq++}`;

export function MediaUpload({
  value,
  onChange,
  imageSlotsLeft,
  videoSlotsLeft,
  allowVideo,
  language = "sr",
  onReject,
}: MediaUploadProps) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const staged: StagedMedia[] = [...value];
      let imgLeft = imageSlotsLeft - staged.filter((s) => s.kind === "image").length;
      let vidLeft = videoSlotsLeft - staged.filter((s) => s.kind === "video").length;

      for (const file of accepted) {
        const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";

        if (kind === "video") {
          if (!allowVideo || vidLeft <= 0) {
            onReject?.(t("guest.mediaUpload.videoLimit", "Dostigli ste maksimalan broj videa."));
            continue;
          }
          let duration = 0;
          try {
            duration = await readVideoDuration(file);
          } catch {
            onReject?.(t("guest.mediaUpload.videoUnreadable", "Video se ne može pročitati."));
            continue;
          }
          if (duration > MAX_VIDEO_DURATION_SEC) {
            onReject?.(
              t("guest.videoUpload.tooLong", `Video može trajati najviše ${MAX_VIDEO_DURATION_SEC} sekundi.`, {
                sec: MAX_VIDEO_DURATION_SEC,
              })
            );
            continue;
          }
          staged.push({ id: nextId(), file, kind, preview: "" });
          vidLeft--;
        } else {
          if (imgLeft <= 0) {
            onReject?.(t("guest.mediaUpload.imageLimit", "Dostigli ste maksimalan broj slika."));
            continue;
          }
          staged.push({ id: nextId(), file, kind, preview: URL.createObjectURL(file) });
          imgLeft--;
        }
      }
      onChange(staged);
    },
    [value, onChange, imageSlotsLeft, videoSlotsLeft, allowVideo, onReject, t]
  );

  const accept: Record<string, string[]> = allowVideo
    ? { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic", ".heif"], "video/*": [] }
    : { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic", ".heif"] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });

  function remove(id: string) {
    const item = value.find((s) => s.id === id);
    if (item?.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    onChange(value.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        data-testid="media-dropzone"
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-primary))]/10"
            : "border-[hsl(var(--lp-muted-foreground))]/20 hover:border-[hsl(var(--lp-primary))]/50"
        }`}
      >
        <input {...getInputProps()} data-testid="media-input" />
        <Upload className="mx-auto h-10 w-10 text-[hsl(var(--lp-muted-foreground))]" />
        <p className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
          {allowVideo
            ? t("guest.mediaUpload.dragOrClick", "Prevucite slike i video ovdje ili kliknite za odabir")
            : t("guest.imageUpload.dragOrClick", "Prevucite slike ovdje ili kliknite za odabir")}
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/20"
            >
              {item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[hsl(var(--lp-muted-foreground))] gap-1">
                  <VideoIcon className="h-7 w-7" />
                  <span className="text-[10px] px-1 truncate max-w-full">{item.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t("guest.mediaUpload.remove", "Ukloni")}
                className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-1 text-[hsl(var(--lp-destructive))] shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/50 text-white rounded px-1 text-[10px] flex items-center gap-0.5">
                {item.kind === "image" ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
