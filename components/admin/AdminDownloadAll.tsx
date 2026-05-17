"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface AdminDownloadAllProps {
  onDownloadImages: () => void;
  onDownloadMessages: () => void;
  imagesCount: number;
  messagesCount: number;
  isDownloadingImages?: boolean;
  isDownloadingMessages?: boolean;
}

const AdminDownloadAll: React.FC<AdminDownloadAllProps> = ({
  onDownloadImages,
  onDownloadMessages,
  imagesCount,
  messagesCount,
  isDownloadingImages = false,
  isDownloadingMessages = false,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">🗂️</span>
        <h3 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--lp-accent))] mb-1">{t('admin.download.title')}</h3>
        <span className="text-sm text-[hsl(var(--lp-muted-foreground))] text-center max-w-xs">{t('admin.download.description')}</span>
      </div>
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Kartica za slike */}
        <div className="flex-1 flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-4">
          <span className="text-3xl">📦</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">{t('admin.download.allImages')}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] mb-2">{t('admin.download.imagesCount')} <b className="text-[hsl(var(--lp-text))]">{imagesCount}</b></span>
          <button
            onClick={onDownloadImages}
            className="w-full py-2 px-4 rounded-lg bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] font-semibold shadow-sm hover:bg-[hsl(var(--lp-primary))]/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={!onDownloadImages || imagesCount === 0 || isDownloadingImages}
          >
            {isDownloadingImages ? (
              <>
                <span className="spinner" /> {t('admin.download.downloadingImages')}
              </>
            ) : (
              <>{t('admin.download.imagesZip', { count: imagesCount })}</>
            )}
          </button>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] text-center">{t('admin.download.imagesZipDescription')}</span>
          {imagesCount === 0 && (
            <span className="text-xs text-[hsl(var(--lp-destructive))] mt-2">{t('admin.download.noImages')}</span>
          )}
        </div>
        {/* Kartica za poruke */}
        <div className="flex-1 flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-4">
          <span className="text-3xl">💌</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">{t('admin.download.allMessages')}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] mb-2">{t('admin.download.messagesCount')} <b className="text-[hsl(var(--lp-text))]">{messagesCount}</b></span>
          <button
            onClick={onDownloadMessages}
            className="w-full py-2 px-4 rounded-lg border border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-primary))] font-semibold shadow-sm hover:bg-[hsl(var(--lp-muted))]/30 transition disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={!onDownloadMessages || messagesCount === 0 || isDownloadingMessages}
          >
            {isDownloadingMessages ? (
              <>
                <span className="spinner" /> {t('admin.download.downloadingMessages')}
              </>
            ) : (
              <>{t('admin.download.messagesZip', { count: messagesCount })}</>
            )}
          </button>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] text-center">{t('admin.download.messagesZipDescription')}</span>
          {messagesCount === 0 && (
            <span className="text-xs text-[hsl(var(--lp-destructive))] mt-2">{t('admin.download.noMessages')}</span>
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--lp-accent))]/30 bg-[hsl(var(--lp-accent))]/10 px-4 py-2 text-sm text-[hsl(var(--lp-accent))] shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
          <span>{t('admin.download.tip')}</span>
        </div>
      </div>
      <style>{`
        .spinner {
          display: inline-block;
          width: 1.1em;
          height: 1.1em;
          border: 2.5px solid currentColor;
          border-top: 2.5px solid transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 4px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDownloadAll;
