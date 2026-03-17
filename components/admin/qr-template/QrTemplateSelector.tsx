"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Check, AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";
import { toast } from "@/hooks/use-toast";

import { QrTemplateSelectorProps, TemplateOption } from "./types";
import { templates } from "./templates";
import ColorPicker from "./ColorPicker";
import TemplateGrid from "./TemplateGrid";
import CanvasRenderer from "./CanvasRenderer";

const QrTemplateSelector: React.FC<QrTemplateSelectorProps> = ({
  qrValue,
  qrColor,
  eventSlug,
  onQrColorChange,
}) => {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const currentLanguage = getCurrentLanguageFromPath(pathname);

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(templates[0]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateLoadError, setTemplateLoadError] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  // Language sync
  useEffect(() => {
    if (currentLanguage && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  // Get QR data URL from hidden QRCodeCanvas
  const getQrDataUrl = useCallback((): string | null => {
    if (!qrRef.current) return null;
    const qrCanvas = qrRef.current.querySelector('canvas');
    if (!qrCanvas) return null;
    return qrCanvas.toDataURL('image/png');
  }, []);

  // Load template image
  const loadTemplateImage = useCallback(() => {
    setTemplateLoadError(false);
    setIsGenerating(true);
    const img = new globalThis.Image();
    img.onload = () => {
      setTemplateImage(img);
      setIsGenerating(false);
    };
    img.onerror = () => {
      setTemplateLoadError(true);
      setIsGenerating(false);
    };
    img.src = selectedTemplate.imageSrc;
  }, [selectedTemplate.imageSrc]);

  useEffect(() => {
    loadTemplateImage();
  }, [loadTemplateImage]);

  // Canvas render callbacks (memoized)
  const handleRendered = useCallback((dataUrl: string) => {
    setGeneratedImage(dataUrl);
    setIsGenerating(false);
  }, []);

  const handleRenderError = useCallback((errorMsg: string) => {
    setIsGenerating(false);
    toast({ variant: "destructive", description: t('admin.dashboard.qr.generationError') });
  }, [t]);

  // Download handler
  const handleDownload = () => {
    if (!generatedImage) return;
    try {
      const a = document.createElement("a");
      a.href = generatedImage;
      a.download = `qr-kod-event-${eventSlug || 'wedding'}-template.png`;
      a.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch {
      toast({ variant: "destructive", description: t('admin.dashboard.qr.downloadError') });
    }
  };

  const qrDataUrl = getQrDataUrl();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-1 sm:px-0 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto">
      {/* Hidden QR code for generation */}
      <div className="hidden" ref={qrRef}>
        <QRCodeCanvas value={qrValue} size={500} bgColor="#FFFFFF" fgColor={qrColor} />
      </div>

      {/* Color picker */}
      <ColorPicker
        qrColor={qrColor}
        onColorChange={(color) => onQrColorChange?.(color)}
      />

      {/* Template grid */}
      <TemplateGrid
        templates={templates}
        selectedId={selectedTemplate.id}
        onSelect={setSelectedTemplate}
      />

      {/* Preview */}
      <div className="mt-2 sm:mt-4">
        <h3 className="text-base sm:text-lg font-medium mb-2 px-1">{t('admin.dashboard.qr.previewTemplate')}</h3>
        <div className="border border-[hsl(var(--lp-accent))]/30 rounded-lg p-3 sm:p-4 bg-white/90 w-full max-w-md mx-auto shadow-sm">
          {templateLoadError ? (
            <div className="flex flex-col items-center justify-center h-36 sm:h-64 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
                {t('admin.dashboard.qr.templateLoadError')}
              </p>
              <Button variant="outline" size="sm" onClick={loadTemplateImage}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('admin.dashboard.qr.retryLoad')}
              </Button>
            </div>
          ) : isGenerating ? (
            <div className="flex items-center justify-center h-36 sm:h-64">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-[hsl(var(--lp-primary))]"></div>
            </div>
          ) : generatedImage ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-md shadow-md bg-white">
                <Image
                  src={generatedImage}
                  alt={t('admin.dashboard.qr.templateAlt')}
                  className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain"
                  width={500}
                  height={500}
                  priority
                  unoptimized
                />
              </div>
              <Button
                onClick={handleDownload}
                className="mt-3 sm:mt-4 w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-2 sticky bottom-0 z-10"
                variant="default"
                size="sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloaded')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloadTemplate')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 sm:h-64 text-[hsl(var(--lp-muted-foreground))] text-sm sm:text-base">
              {t('admin.dashboard.qr.generatingPreview')}
            </div>
          )}
        </div>
      </div>

      {/* Canvas renderer (hidden) */}
      {templateImage && qrDataUrl && (
        <CanvasRenderer
          templateImage={templateImage}
          template={selectedTemplate}
          qrDataUrl={qrDataUrl}
          qrColor={qrColor}
          onRendered={handleRendered}
          onError={handleRenderError}
        />
      )}
    </div>
  );
};

export default QrTemplateSelector;
