import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';

export const MAX_VIDEO_DURATION_SEC = 30;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_FOLDER = 'wedding-app/videos';

/** Per-guest active video slots for a tier. 0 = tier may not upload video. */
export function getVideoLimit(tier: PricingTier): number {
  return PRICING_TIERS[tier]?.videoLimit ?? 0;
}

export function validateVideoMeta(meta: {
  durationSec: number;
  bytes: number;
}): { ok: true } | { ok: false; reason: 'duration' | 'size' } {
  if (meta.durationSec > MAX_VIDEO_DURATION_SEC) return { ok: false, reason: 'duration' };
  if (meta.bytes > MAX_VIDEO_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/** Cloudinary auto-generates a poster frame at the same path with a .jpg extension. */
export function derivePosterUrl(secureUrl: string): string {
  if (/\.[^/.]+$/.test(secureUrl)) return secureUrl.replace(/\.[^/.]+$/, '.jpg');
  return `${secureUrl}.jpg`;
}

/** Defence-in-depth: confirm only accepts assets we told the browser to create. */
export function isOwnedVideoPublicId(publicId: string): boolean {
  return publicId.startsWith(`${VIDEO_FOLDER}/`) && !publicId.includes('..');
}
