import { uploadWithCsrfRetry } from '@/lib/csrf-client';
import { getClientResizeParams, type PricingTier } from '@/lib/pricing-tiers';

/** Tier-aware client resize (moved verbatim from Upload-Form.tsx). maxWidth 0 = no resize. */
export async function resizeImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    if (maxWidth === 0) { resolve(file); return; }
    if (file.size < 1024 * 1024) { resolve(file); return; }

    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      if (img.width <= maxWidth && file.size < 2 * 1024 * 1024) { resolve(file); return; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas not supported');
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type.includes('jpeg') || file.type.includes('jpg') ? 'image/jpeg' : file.type;
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: outputType }) : file),
        outputType,
        quality
      );
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/** Resize per tier, POST one image to /api/guest/upload, report 0..100. Throws on failure. */
export async function uploadImageFile(
  file: File,
  tier: PricingTier,
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(0);
  const { maxWidth, quality } = getClientResizeParams(tier);
  const resized = await resizeImage(file, maxWidth, quality);
  const formData = new FormData();
  formData.append('images', resized);
  const response = await uploadWithCsrfRetry('/api/guest/upload', formData, {
    csrfEndpoint: '/api/guest/upload',
    onProgress,
  });
  const data = await response.json().catch(() => ({ error: 'Neispravan odgovor servera' }));
  if (!response.ok) throw new Error(data.error || 'Došlo je do greške');
}
