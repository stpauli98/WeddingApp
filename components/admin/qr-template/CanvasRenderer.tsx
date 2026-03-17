"use client";

import { useRef, useEffect, useCallback } from "react";
import { CanvasRendererProps } from "./types";

export default function CanvasRenderer({
  templateImage,
  template,
  qrDataUrl,
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

      // 3. QR layer
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

      // 4. Output
      onRendered(canvas.toDataURL('image/png'));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Canvas rendering failed');
    }
  }, [templateImage, template, qrDataUrl, qrColor, onRendered, onError]);

  useEffect(() => {
    render();
  }, [render]);

  return <canvas ref={canvasRef} style={{ display: 'none' }} />;
}
