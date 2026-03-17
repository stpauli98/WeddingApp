# QR Template Selector Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor QrTemplateSelector into multi-layer canvas architecture with couple name text, URL text, and error handling.

**Architecture:** Split 314-line monolith into 6 focused files under `components/admin/qr-template/`. Canvas renders 3 layers (background, text, QR). Fonts loaded via FontFace API separately from Next.js font system.

**Tech Stack:** Next.js 15, TypeScript, Canvas API, FontFace API, qrcode.react, react-i18next, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-17-qr-template-improvements-design.md`

---

## Task 1: Create types and template configuration

**Files:**
- Create: `components/admin/qr-template/types.ts`
- Create: `components/admin/qr-template/templates.ts`

- [ ] **Step 1: Create types.ts**

Create `components/admin/qr-template/types.ts`:

```typescript
export interface TextPosition {
  x: number;       // percentage of width (center point)
  y: number;       // percentage of height (center point)
  fontSize: number; // percentage of canvas width (auto-scaled)
}

export interface QrPosition {
  x: number;       // percentage of width (center point)
  y: number;       // percentage of height (center point)
  width: number;   // percentage of width
  height: number;  // percentage of height
}

export interface TemplateOption {
  id: string;
  name: string;
  imageSrc: string;
  qrPosition: QrPosition;
  namePosition: TextPosition;
  urlPosition: TextPosition;
}

export interface QrTemplateSelectorProps {
  qrValue: string;
  qrColor: string;
  eventSlug: string;
  coupleName: string;
  onQrColorChange?: (color: string) => void;
}

export interface CanvasRendererProps {
  templateImage: HTMLImageElement;
  template: TemplateOption;
  qrDataUrl: string;
  coupleName: string;
  guestUrl: string;
  qrColor: string;
  onRendered: (dataUrl: string) => void;
  onError: (error: string) => void;
}
```

- [ ] **Step 2: Create templates.ts**

Create `components/admin/qr-template/templates.ts`:

```typescript
import { TemplateOption } from './types';

export const templates: TemplateOption[] = [
  {
    id: 'template1',
    name: 'template1',
    imageSrc: '/templates/wedding-template-1.jpg',
    qrPosition: { x: 50, y: 86, width: 35, height: 25 },
    namePosition: { x: 50, y: 72, fontSize: 4 },
    urlPosition: { x: 50, y: 97, fontSize: 1.8 },
  },
  {
    id: 'template2',
    name: 'template2',
    imageSrc: '/templates/wedding-template-2.jpg',
    qrPosition: { x: 49, y: 52, width: 45, height: 33 },
    namePosition: { x: 49, y: 30, fontSize: 4 },
    urlPosition: { x: 49, y: 72, fontSize: 1.8 },
  },
  {
    id: 'template3',
    name: 'template3',
    imageSrc: '/templates/wedding-template-3.jpg',
    qrPosition: { x: 49, y: 27, width: 35, height: 23 },
    namePosition: { x: 49, y: 10, fontSize: 4 },
    urlPosition: { x: 49, y: 42, fontSize: 1.8 },
  },
  {
    id: 'template4',
    name: 'template4',
    imageSrc: '/templates/wedding-template-4.jpg',
    qrPosition: { x: 49, y: 45, width: 35, height: 23 },
    namePosition: { x: 49, y: 28, fontSize: 4 },
    urlPosition: { x: 49, y: 60, fontSize: 1.8 },
  },
];

export const predefinedColors = [
  "#000000", "#0047AB", "#6B8E23", "#800020", "#4B0082",
  "#228B22", "#8B4513", "#4682B4", "#708090", "#CD5C5C",
];
```

Note: `namePosition` and `urlPosition` values are initial estimates. They will be calibrated visually in Task 7.

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds (files are not imported anywhere yet).

- [ ] **Step 4: Commit**

```bash
git add components/admin/qr-template/types.ts components/admin/qr-template/templates.ts
git commit -m "feat(qr): add types and template configuration for multi-layer canvas"
```

---

## Task 2: Create CanvasRenderer

**Files:**
- Create: `components/admin/qr-template/CanvasRenderer.tsx`

- [ ] **Step 1: Create CanvasRenderer.tsx**

Create `components/admin/qr-template/CanvasRenderer.tsx`:

```typescript
"use client";

import { useRef, useEffect, useCallback } from "react";
import { CanvasRendererProps } from "./types";

// Load fonts via FontFace API (separate from Next.js font system)
async function loadCanvasFonts(): Promise<{ nameFont: string; urlFont: string }> {
  try {
    const playfair = new FontFace(
      'Playfair Canvas',
      'url(https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtbK-F2rA0s.woff2)'
    );
    const inter = new FontFace(
      'Inter Canvas',
      'url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2)'
    );
    await Promise.race([
      Promise.all([playfair.load(), inter.load()]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Font load timeout')), 3000))
    ]);
    document.fonts.add(playfair);
    document.fonts.add(inter);
    return { nameFont: 'Playfair Canvas', urlFont: 'Inter Canvas' };
  } catch {
    return { nameFont: 'serif', urlFont: 'sans-serif' };
  }
}

export default function CanvasRenderer({
  templateImage,
  template,
  qrDataUrl,
  coupleName,
  guestUrl,
  qrColor,
  onRendered,
  onError,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onError('Canvas context not available');
      return;
    }

    try {
      // 1. Set dimensions from template
      canvas.width = templateImage.naturalWidth;
      canvas.height = templateImage.naturalHeight;

      // 2. Background layer - draw template
      ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

      // 3. Load fonts
      const fonts = await loadCanvasFonts();

      // 4. Name layer - couple name above QR (skip if empty)
      if (coupleName && coupleName.trim()) {
        const nameFontSize = (template.namePosition.fontSize / 100) * canvas.width;
        ctx.font = `bold ${nameFontSize}px ${fonts.nameFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameX = (template.namePosition.x / 100) * canvas.width;
        const nameY = (template.namePosition.y / 100) * canvas.height;

        // Drop shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = nameFontSize * 0.15;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(coupleName.trim(), nameX, nameY);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 5. QR layer
      const qrImage = new globalThis.Image();
      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error('QR image failed to load'));
        qrImage.src = qrDataUrl;
      });

      const qrWidth = (template.qrPosition.width / 100) * canvas.width;
      const qrHeight = (template.qrPosition.height / 100) * canvas.height;
      const qrX = (template.qrPosition.x / 100) * canvas.width - (qrWidth / 2);
      const qrY = (template.qrPosition.y / 100) * canvas.height - (qrHeight / 2);
      ctx.drawImage(qrImage, qrX, qrY, qrWidth, qrHeight);

      // 6. URL layer - below QR
      if (guestUrl) {
        const urlFontSize = (template.urlPosition.fontSize / 100) * canvas.width;
        ctx.font = `400 ${urlFontSize}px ${fonts.urlFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const urlX = (template.urlPosition.x / 100) * canvas.width;
        const urlY = (template.urlPosition.y / 100) * canvas.height;

        // Subtle shadow for URL
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = urlFontSize * 0.1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(guestUrl, urlX, urlY);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 7. Output
      onRendered(canvas.toDataURL('image/png'));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Canvas rendering failed');
    }
  }, [templateImage, template, qrDataUrl, coupleName, guestUrl, qrColor, onRendered, onError]);

  useEffect(() => {
    render();
  }, [render]);

  return <canvas ref={canvasRef} style={{ display: 'none' }} />;
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/admin/qr-template/CanvasRenderer.tsx
git commit -m "feat(qr): add multi-layer CanvasRenderer with font loading and text rendering"
```

---

## Task 3: Create ColorPicker and TemplateGrid

**Files:**
- Create: `components/admin/qr-template/ColorPicker.tsx`
- Create: `components/admin/qr-template/TemplateGrid.tsx`

- [ ] **Step 1: Create ColorPicker.tsx**

Create `components/admin/qr-template/ColorPicker.tsx`:

```typescript
"use client";

import { useTranslation } from "react-i18next";
import { predefinedColors } from "./templates";

interface ColorPickerProps {
  qrColor: string;
  onColorChange: (color: string) => void;
}

export default function ColorPicker({ qrColor, onColorChange }: ColorPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 sm:mb-4">
      <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.chooseColor')}</h4>
      <div className="flex flex-wrap gap-2">
        {predefinedColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => qrColor !== color && onColorChange(color)}
            className={`w-6 h-6 rounded-full border ${qrColor === color ? 'ring-2 ring-[hsl(var(--lp-primary))] border-[hsl(var(--lp-primary))]' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`${t('admin.dashboard.qr.selectColor')} ${color}`}
          />
        ))}
        <div className="flex items-center">
          <input
            type="color"
            value={qrColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
            title={t('admin.dashboard.qr.customColor')}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TemplateGrid.tsx**

Create `components/admin/qr-template/TemplateGrid.tsx`:

```typescript
"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import { TemplateOption } from "./types";

interface TemplateGridProps {
  templates: TemplateOption[];
  selectedId: string;
  onSelect: (template: TemplateOption) => void;
}

export default function TemplateGrid({ templates, selectedId, onSelect }: TemplateGridProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 sm:mb-4">
      <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.templateSelection')}</h4>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1 snap-x snap-mandatory">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex flex-col items-center shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onSelect(tpl)}
              className={`border rounded-md overflow-hidden w-24 h-36 sm:w-28 sm:h-40 flex-none shadow-sm ${selectedId === tpl.id ? 'border-[hsl(var(--lp-primary))] ring-2 ring-[hsl(var(--lp-primary))]' : 'border-gray-300 hover:border-[hsl(var(--lp-primary))]'}`}
              title={t(`admin.dashboard.qr.${tpl.name}`)}
            >
              <Image
                src={tpl.imageSrc}
                alt={t(`admin.dashboard.qr.${tpl.name}`)}
                className="object-cover w-full h-full"
                width={112}
                height={160}
              />
            </button>
            <span className="text-xs mt-1 text-center text-gray-700">
              {t(`admin.dashboard.qr.${tpl.name}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note: `priority` removed from `<Image>` — uses default lazy loading.

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/admin/qr-template/ColorPicker.tsx components/admin/qr-template/TemplateGrid.tsx
git commit -m "feat(qr): add ColorPicker and TemplateGrid extracted components"
```

---

## Task 4: Create new QrTemplateSelector (main container)

**Files:**
- Create: `components/admin/qr-template/QrTemplateSelector.tsx`

- [ ] **Step 1: Create QrTemplateSelector.tsx**

Create `components/admin/qr-template/QrTemplateSelector.tsx`:

```typescript
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
  coupleName: initialCoupleName,
  onQrColorChange,
}) => {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const currentLanguage = getCurrentLanguageFromPath(pathname);

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(templates[0]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [coupleName, setCoupleName] = useState(initialCoupleName || '');
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateLoadError, setTemplateLoadError] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  // Language sync
  useEffect(() => {
    if (currentLanguage && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  // Display URL for template (visual only, not functional)
  const displayUrl = `dodajuspomenu.com/guest/${eventSlug}`;

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
    setError(null);
    setIsGenerating(false);
  }, []);

  const handleRenderError = useCallback((errorMsg: string) => {
    setError(errorMsg);
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

  // Get fresh QR data URL for canvas renderer
  const qrDataUrl = getQrDataUrl();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-1 sm:px-0 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto">
      {/* Hidden QR code for generation */}
      <div className="hidden" ref={qrRef}>
        <QRCodeCanvas value={qrValue} size={500} bgColor="#FFFFFF" fgColor={qrColor} />
      </div>

      {/* Couple name input */}
      <div className="mb-2">
        <label htmlFor="couple-name-input" className="text-sm font-medium mb-1 block">
          {t('admin.dashboard.qr.coupleName')}
        </label>
        <input
          id="couple-name-input"
          type="text"
          value={coupleName}
          onChange={(e) => setCoupleName(e.target.value)}
          placeholder={t('admin.dashboard.qr.coupleNamePlaceholder')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--lp-primary))] focus:border-[hsl(var(--lp-primary))]"
          aria-label={t('admin.dashboard.qr.coupleName')}
        />
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
          coupleName={coupleName}
          guestUrl={displayUrl}
          qrColor={qrColor}
          onRendered={handleRendered}
          onError={handleRenderError}
        />
      )}
    </div>
  );
};

export default QrTemplateSelector;
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds (new component not yet imported by parent).

- [ ] **Step 3: Commit**

```bash
git add components/admin/qr-template/QrTemplateSelector.tsx
git commit -m "feat(qr): add refactored QrTemplateSelector with couple name input and error handling"
```

---

## Task 5: Add i18n keys

**Files:**
- Modify: `locales/sr/translation.json`
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Add Serbian keys**

In `locales/sr/translation.json`, inside the `admin.dashboard.qr` object, add:

```json
"coupleName": "Ime para na predlošku",
"coupleNamePlaceholder": "npr. Marko & Ana",
"templateLoadError": "Predložak nije dostupan",
"retryLoad": "Pokušaj ponovo",
"generationError": "Greška pri generisanju predloška",
"downloadError": "Greška pri preuzimanju"
```

- [ ] **Step 2: Add English keys**

In `locales/en/translation.json`, inside the `admin.dashboard.qr` object, add:

```json
"coupleName": "Couple name on template",
"coupleNamePlaceholder": "e.g. Mark & Anna",
"templateLoadError": "Template unavailable",
"retryLoad": "Try again",
"generationError": "Error generating template",
"downloadError": "Error downloading"
```

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add locales/sr/translation.json locales/en/translation.json
git commit -m "feat(qr): add i18n keys for QR template improvements"
```

---

## Task 6: Wire up - update AdminDashboardTabs and swap imports

**Files:**
- Modify: `components/admin/AdminDashboardTabs.tsx`

- [ ] **Step 1: Update import path**

In `components/admin/AdminDashboardTabs.tsx`, change line 11:

From:
```typescript
import QrTemplateSelector from "@/components/admin/QrTemplateSelector";
```

To:
```typescript
import QrTemplateSelector from "@/components/admin/qr-template/QrTemplateSelector";
```

- [ ] **Step 2: Add coupleName prop**

Find the `<QrTemplateSelector` usage (around line 262) and add `coupleName`:

From:
```typescript
<QrTemplateSelector
  qrValue={guestUrl}
  qrColor={qrColor}
  eventSlug={event?.slug || 'wedding'}
  onQrColorChange={(color) => setQrColor(color)}
/>
```

To:
```typescript
<QrTemplateSelector
  qrValue={guestUrl}
  qrColor={qrColor}
  eventSlug={event?.slug || 'wedding'}
  coupleName={event?.coupleName || ''}
  onQrColorChange={(color) => setQrColor(color)}
/>
```

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds. The new QrTemplateSelector is now active.

- [ ] **Step 4: Manual test**

Run: `pnpm dev`
1. Go to admin dashboard
2. Open QR template modal
3. Verify couple name input is pre-filled
4. Change couple name -> preview updates
5. Change color -> preview updates
6. Switch templates -> preview updates
7. Download -> file downloads correctly
8. Verify couple name and URL text appear on the generated image

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminDashboardTabs.tsx
git commit -m "feat(qr): wire up new QrTemplateSelector with coupleName prop"
```

---

## Task 7: Calibrate text positions and cleanup

**Files:**
- Modify: `components/admin/qr-template/templates.ts` (calibrate positions)
- Delete: `components/admin/QrTemplateSelector.tsx` (old monolith)

- [ ] **Step 1: Visually calibrate text positions**

Run `pnpm dev`, open each template in the QR modal, and adjust `namePosition` and `urlPosition` values in `templates.ts` until text renders correctly:
- Couple name should be clearly above QR, not overlapping
- URL should be below QR, not overlapping
- Both should be readable (check against all 4 templates)

Update values in `components/admin/qr-template/templates.ts` as needed.

- [ ] **Step 2: Delete old monolith**

Delete: `components/admin/QrTemplateSelector.tsx`

Verify no other file imports it:
```bash
grep -r "admin/QrTemplateSelector" --include="*.tsx" --include="*.ts" .
```
Expected: No results (only the new path should be referenced).

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(qr): calibrate text positions and remove old QrTemplateSelector monolith"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Zero errors.

- [ ] **Step 2: Full manual test**

1. Login as admin
2. Go to dashboard -> open QR template modal
3. Test all 4 templates with couple name and URL text
4. Test empty couple name (should skip name rendering)
5. Test color changes
6. Test download
7. Verify no console errors

- [ ] **Step 3: Commit all remaining changes and verify**

```bash
git status
```

If clean, done. If uncommitted changes remain, commit them.

---

## Out of Scope (tracked in spec)
- Drag and drop QR positioning
- Custom template upload
- PDF download format
- QR with logo in center
- URL shortening/redirect logic
- Mobile zoom/preview
