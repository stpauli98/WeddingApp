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

// Determine shadow color based on text color (light text gets dark shadow, dark text gets light shadow)
function getShadowColor(textColor: string): string {
  // Simple check: if text is light (white-ish), use dark shadow; otherwise use light shadow
  const hex = textColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 128 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)';
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

      // Get text color and shadow from template config
      const textColor = template.textColor || '#FFFFFF';
      const shadowColor = getShadowColor(textColor);

      // 4. Name layer - couple name (skip if empty)
      if (coupleName && coupleName.trim()) {
        const nameFontSize = (template.namePosition.fontSize / 100) * canvas.width;
        ctx.font = `bold ${nameFontSize}px ${fonts.nameFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameX = (template.namePosition.x / 100) * canvas.width;
        const nameY = (template.namePosition.y / 100) * canvas.height;

        // Shadow for readability
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = nameFontSize * 0.12;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = textColor;
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

        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = urlFontSize * 0.08;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = textColor;
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
