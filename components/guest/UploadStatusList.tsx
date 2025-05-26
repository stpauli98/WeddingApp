"use client";

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
        <h3 className="text-sm font-medium mb-3">{t('guest.uploadStatus.title', 'Status uploada slika')}</h3>
        
        {/* Lista statusa */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {uploadStatuses.map((status) => (
            <div key={status.id} className="flex items-center justify-between p-2 bg-[hsl(var(--lp-muted))]/10 rounded-md">
              <div className="flex items-center space-x-3 overflow-hidden">
                {/* Preview slike */}
                {status.preview && (
                  <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-[hsl(var(--lp-accent))]/30">
                    <img 
                      src={status.preview} 
                      alt={t('guest.uploadStatus.imagePreview', 'Pregled slike')} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Ime fajla i status */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{status.file.name}</p>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[hsl(var(--lp-muted))]/30 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        status.status === 'error' 
                          ? 'bg-[hsl(var(--lp-destructive))]' 
                          : status.status === 'success'
                            ? 'bg-[hsl(var(--lp-success))]'
                            : 'bg-[hsl(var(--lp-primary))]'
                      }`}
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                  
                  {/* Status tekst */}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                      {status.status === 'waiting' && t('guest.uploadStatus.waiting', 'Čeka na upload...')}
                      {status.status === 'uploading' && t('guest.uploadStatus.uploading', 'Slanje u toku...')}
                      {status.status === 'success' && t('guest.uploadStatus.success', 'Uspješno uploadovano')}
                      {status.status === 'error' && (status.error || t('guest.uploadStatus.error', 'Greška pri uploadu'))}
                    </p>
                    <span className="text-xs font-medium text-[hsl(var(--lp-foreground))]">{status.progress}%</span>
                  </div>
                </div>
              </div>
              
              {/* Status ikona */}
              <div className="flex-shrink-0 ml-2">
                {status.status === 'uploading' && (
                  <Loader2 className="h-5 w-5 text-[hsl(var(--lp-accent))] animate-spin" />
                )}
                {status.status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-[hsl(var(--lp-success))]" />
                )}
                {status.status === 'error' && (
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-5 w-5 text-[hsl(var(--lp-destructive))]" />
                    {status.retryable && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-[hsl(var(--lp-primary))] hover:text-[hsl(var(--lp-primary-hover))] hover:bg-[hsl(var(--lp-muted))]/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryUpload(status.id);
                        }}
                        disabled={isLoading}
                      >
                        {t('guest.uploadStatus.retry', 'Pokušaj ponovo')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer sa informacijom i opcijom za retry svih */}
        <div className="mt-4 pt-3 border-t border-[hsl(var(--lp-accent))]/10 flex justify-between items-center">
          <span className="text-sm text-[hsl(var(--lp-muted-foreground))]">
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
              className="text-xs"
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
