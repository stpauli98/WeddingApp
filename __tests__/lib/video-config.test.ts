import {
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEO_BYTES,
  getVideoLimit,
  validateVideoMeta,
  derivePosterUrl,
  isOwnedVideoPublicId,
} from '@/lib/video-config';

describe('video-config', () => {
  it('exposes the agreed caps', () => {
    expect(MAX_VIDEO_DURATION_SEC).toBe(60);
    expect(MAX_VIDEO_BYTES).toBe(100 * 1024 * 1024);
  });

  it('only premium/unlimited tiers may upload video', () => {
    expect(getVideoLimit('premium')).toBe(3);
    expect(getVideoLimit('unlimited')).toBe(3);
    expect(getVideoLimit('free')).toBe(0);
    expect(getVideoLimit('basic')).toBe(0);
  });

  it('accepts a 30s/10MB video', () => {
    expect(validateVideoMeta({ durationSec: 30, bytes: 10 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it('rejects over-length and over-size video', () => {
    expect(validateVideoMeta({ durationSec: 61, bytes: 1000 })).toEqual({ ok: false, reason: 'duration' });
    expect(validateVideoMeta({ durationSec: 10, bytes: MAX_VIDEO_BYTES + 1 })).toEqual({ ok: false, reason: 'size' });
  });

  it('derives a .jpg poster URL from a video secure_url', () => {
    expect(
      derivePosterUrl('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.mp4')
    ).toBe('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.jpg');
    // no extension → append
    expect(derivePosterUrl('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc')).toBe(
      'https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.jpg'
    );
  });

  it('only trusts public_ids inside our video folder', () => {
    expect(isOwnedVideoPublicId('wedding-app/videos/abc')).toBe(true);
    expect(isOwnedVideoPublicId('wedding-app/abc')).toBe(false);
    expect(isOwnedVideoPublicId('../etc/passwd')).toBe(false);
  });
});
