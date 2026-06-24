import { fetchWithCsrfRetry } from '@/lib/csrf-client';
import { uploadVideoToCloudinary, type VideoSignData } from '@/lib/uploadVideoToCloudinary';

/** Full guest video pipeline for one file: sign -> direct Cloudinary upload -> confirm.
 *  Progress 0..100 is driven by the Cloudinary XHR. Throws Error(message) on failure. */
export async function uploadVideoFlow(file: File, onProgress: (pct: number) => void): Promise<void> {
  onProgress(0);
  const signRes = await fetchWithCsrfRetry('/api/guest/upload/video-sign', {
    method: 'POST',
    csrfEndpoint: '/api/guest/upload/video-sign',
  });
  const signData = (await signRes.json()) as VideoSignData & { error?: string };
  if (!signRes.ok) throw new Error(signData.error || 'Greška pri pripremi upload-a.');

  const { publicId } = await uploadVideoToCloudinary(file, signData, onProgress);

  const confirmRes = await fetchWithCsrfRetry('/api/guest/upload/video-confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicId }),
    csrfEndpoint: '/api/guest/upload/video-sign',
  });
  const confirmData = await confirmRes.json().catch(() => ({}));
  if (!confirmRes.ok) throw new Error((confirmData as { error?: string }).error || 'Greška pri potvrdi videa.');
}
