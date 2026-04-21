"use client";

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

// Tip za status uploada slike
export type ImageUploadStatus = {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
  retryable?: boolean; // Označava da li se upload može ponovno pokušati
};

interface UploadStatusListProps {
  uploadStatuses: ImageUploadStatus[];
  isLoading: boolean;
  onRetryUpload: (statusId: string) => void;
  onRetryAllFailed: () => void;
  language?: string;
}

// Fiksna širina right rail-a (ikona + procenat). Držimo je u sinhronizaciji
// kroz sve status-e kako se layout ne bi pomjerao bez obzira na dužinu
// filename-a ili status teksta. 56px daje dovoljno prostora za "100%" i
// 20px ikonu sa razmakom.
const RIGHT_RAIL_WIDTH = "w-14"; // 56px

export function UploadStatusList({
  uploadStatuses,
  isLoading,
  onRetryUpload,
  onRetryAllFailed,
  language = 'sr'
}: UploadStatusListProps) {
  const { t, i18n } = useTranslation();

  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Ako nema statusa, ne prikazujemo ništa
  if (uploadStatuses.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border border-[hsl(var(--lp-accent))]/30 shadow-sm">
      <div className="p-4">
        <h3 className="text-sm font-medium mb-3 text-[hsl(var(--lp-foreground))]">
          {t('guest.uploadStatus.title', 'Status uploada slika')}
        </h3>

        {/* Lista statusa. Scroll authority je outer modal card (max-h-[90vh]
            overflow-y-auto u Upload-Form.tsx). Nested scroll ovdje je uzrokovao
            chaining → footer se pomjerao kako je lista rasla. */}
        <ul className="space-y-2" aria-label={t('guest.uploadStatus.title', 'Status uploada slika')}>
          {uploadStatuses.map((status) => {
            const isUploading = status.status === 'uploading';
            const isSuccess = status.status === 'success';
            const isError = status.status === 'error';
            const isWaiting = status.status === 'waiting';

            // Semantičke boje za progress bar (fill)
            const barFillColor = isError
              ? 'bg-[hsl(var(--lp-destructive))]'
              : isSuccess
                ? 'bg-[hsl(var(--lp-success))]'
                : 'bg-[hsl(var(--lp-primary))]';

            // Boja procenta: prati semantiku statusa ali umjereno
            const percentColor = isError
              ? 'text-[hsl(var(--lp-destructive))]'
              : isSuccess
                ? 'text-[hsl(var(--lp-success))]'
                : isUploading
                  ? 'text-[hsl(var(--lp-foreground))]'
                  : 'text-[hsl(var(--lp-muted-foreground))]';

            // Suptilni row background za error/success da pojača feedback
            const rowBg = isError
              ? 'bg-[hsl(var(--lp-destructive))]/5'
              : isSuccess
                ? 'bg-[hsl(var(--lp-success))]/5'
                : 'bg-[hsl(var(--lp-muted))]/10';

            return (
              <li
                key={status.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${rowBg} transition-colors`}
              >
                {/* Thumbnail — fiksna širina, zaobljen, suptilni border */}
                {status.preview && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/20">
                    <Image
                      src={status.preview}
                      alt={t('guest.uploadStatus.imagePreview', 'Pregled slike')}
                      className="w-full h-full object-cover"
                      width={40}
                      height={40}
                      unoptimized={status.preview.startsWith('blob:') || status.preview.startsWith('data:')}
                    />
                  </div>
                )}

                {/* Srednja kolona: filename + progress + status text.
                    min-w-0 je obavezno da flex child može shrink-ovati i
                    omogući `truncate` na filename-u. */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium text-[hsl(var(--lp-foreground))] truncate"
                    title={status.file.name}
                  >
                    {status.file.name}
                  </p>

                  {/* Progress bar — vizualni fokus kad je uploading */}
                  <div
                    className="w-full h-1.5 bg-[hsl(var(--lp-muted))]/30 rounded-full mt-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={status.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('guest.uploadStatus.progressLabel', `Upload progress for ${status.file.name}: ${status.progress}%`)}
                  >
                    <div
                      className={`h-full rounded-full ${barFillColor} transition-[width] duration-200 ease-out`}
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>

                  {/* Status tekst — sekundarna informacija.
                      % je MAKNUT odavde da ga filename/status dužina ne pomjera. */}
                  <p
                    id={`upload-status-${status.id}`}
                    className="text-xs text-[hsl(var(--lp-muted-foreground))] mt-1 truncate"
                  >
                    {isWaiting && t('guest.uploadStatus.waiting', 'Čeka na upload...')}
                    {isUploading && t('guest.uploadStatus.uploading', 'Slanje u toku...')}
                    {isSuccess && t('guest.uploadStatus.success', 'Uspješno uploadovano')}
                    {isError && (status.error || t('guest.uploadStatus.error', 'Greška pri uploadu'))}
                  </p>

                  {/* Retry dugme — samo za error + retryable.
                      Smješteno ispod status teksta da ne kompetira s right
                      rail-om; puno-širine klik target na mobile. */}
                  {isError && status.retryable && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 px-2.5 text-xs border-[hsl(var(--lp-destructive))]/30 text-[hsl(var(--lp-destructive))] hover:bg-[hsl(var(--lp-destructive))]/10 hover:text-[hsl(var(--lp-destructive))]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryUpload(status.id);
                      }}
                      disabled={isLoading}
                      aria-label={t('guest.uploadStatus.retryAriaLabel', `Retry upload for ${status.file.name}`)}
                      title={t('guest.uploadStatus.retryTitle', 'Click to retry this upload')}
                    >
                      {t('guest.uploadStatus.retry', 'Pokušaj ponovo')}
                    </Button>
                  )}
                </div>

                {/* FIKSIRANI RIGHT RAIL — ikona + procenat.
                    Fiksna širina (w-14) garantuje da se % i ikona
                    nikad ne pomjeraju bez obzira na filename/status text.
                    `tabular-nums` drži 1/10/100% na istoj poziciji. */}
                <div
                  className={`${RIGHT_RAIL_WIDTH} flex-shrink-0 flex flex-col items-end justify-center gap-1`}
                  aria-hidden={false}
                >
                  <div className="h-5 w-5 flex items-center justify-center">
                    {isUploading && (
                      <Loader2
                        className="h-5 w-5 text-[hsl(var(--lp-primary))] animate-spin"
                        aria-label={t('guest.uploadStatus.uploading', 'Slanje u toku...')}
                      />
                    )}
                    {isSuccess && (
                      <CheckCircle
                        className="h-5 w-5 text-[hsl(var(--lp-success))]"
                        aria-label={t('guest.uploadStatus.success', 'Uspješno uploadovano')}
                      />
                    )}
                    {isError && (
                      <AlertCircle
                        className="h-5 w-5 text-[hsl(var(--lp-destructive))]"
                        aria-label={t('guest.uploadStatus.error', 'Greška pri uploadu')}
                      />
                    )}
                    {isWaiting && (
                      <span
                        className="h-2 w-2 rounded-full bg-[hsl(var(--lp-muted-foreground))]/50"
                        aria-label={t('guest.uploadStatus.waiting', 'Čeka na upload...')}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium tabular-nums ${percentColor}`}
                  >
                    {status.progress}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer sa informacijom i opcijom za retry svih */}
        <div className="mt-4 pt-3 border-t border-[hsl(var(--lp-accent))]/10 flex justify-between items-center gap-3">
          <span className="text-sm text-[hsl(var(--lp-muted-foreground))] min-w-0 truncate">
            {isLoading
              ? t('guest.uploadStatus.pleaseWait', "Molimo sačekajte dok se slike uploaduju...")
              : uploadStatuses.some(s => s.status === 'error' && s.retryable)
                ? t('guest.uploadStatus.someFailedUpload', "Neke slike nisu uspješno uploadovane.")
                : t('guest.uploadStatus.uploadStatus', "Status uploada slika")}
          </span>

          {!isLoading && uploadStatuses.some(s => s.status === 'error' && s.retryable) && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex-shrink-0 border-[hsl(var(--lp-accent))]/40 hover:bg-[hsl(var(--lp-accent))]/10"
              onClick={onRetryAllFailed}
            >
              {t('guest.uploadStatus.retryAllFailed', 'Pokušaj ponovno sve neuspjele')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
