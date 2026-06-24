# Unified Guest Media Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the guest dashboard's two disjoint upload sections (images, videos) with one cohesive "Dodaj uspomene" experience: a single staged picker that accepts images **and** videos, one unified progress list, and one mixed media gallery.

**Architecture:** Pure guest-UI refactor. Both existing upload pipelines stay byte-for-byte (image → `POST /api/guest/upload`; video → sign → Cloudinary XHR → confirm). We extract each pipeline's single-file step into a reusable helper, build a staged mixed picker (`MediaUpload`), an orchestrator (`UnifiedUploadForm`) that runs both pipelines in parallel through the existing `UploadStatusList`, and a merged gallery (`MediaGallery`). `DashboardClient` is rewired to render one uploader + one gallery.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, react-i18next, react-dropzone, Tailwind, Jest + Testing Library.

## Global Constraints

- **No backend changes.** All API routes, server limits, CSRF, CSP, and the Prisma schema stay exactly as they are. This plan only touches `components/guest/*`, `lib/upload*`, `app/guest/dashboard/page.tsx`, and `locales/*`.
- **Two pipelines stay separate** under the hood (no combined single request). Only the UI is unified.
- **Staged flow:** pick a mix → all staged as removable thumbnails → one "Potvrdi upload" runs everything; message sent once; one progress list; on all-success redirect to `/{lang}/guest/success`.
- **Separate limits:** image limit and video limit are independent; the header shows two counters. Video half appears only when `videoLimit > 0`.
- **Video caps unchanged:** `MAX_VIDEO_DURATION_SEC = 60` (from `@/lib/video-config`); duration pre-checked at stage time, server stays authoritative.
- **i18n:** every new/changed user-facing string exists in both `locales/sr/translation.json` and `locales/en/translation.json`; `t()` calls with placeholders MUST pass the interpolation object (no literal `{{…}}`).
- Tests run via `pnpm test:unit -- <file>`. Component tests use jsdom (default) + Testing Library; mock `@/lib/csrf-client`, the upload helpers, and `react-i18next` as the existing guest tests do.
- Package manager is **pnpm**.

---

### Task 1: Image single-file upload helper (`lib/uploadImageToServer.ts`)

Extract the image resize + POST logic currently inlined in `components/guest/Upload-Form.tsx` (`resizeImage` + `uploadSingleImage`) into a reusable, independently-callable helper so `UnifiedUploadForm` can drive one image at a time.

**Files:**
- Create: `lib/uploadImageToServer.ts`
- Test: `__tests__/lib/uploadImageToServer.test.ts`

**Interfaces:**
- Consumes: `getClientResizeParams` from `@/lib/pricing-tiers`, `uploadWithCsrfRetry` from `@/lib/csrf-client`, `PricingTier` from `@/lib/pricing-tiers`.
- Produces:
  - `resizeImage(file: File, maxWidth: number, quality: number): Promise<File>`
  - `uploadImageFile(file: File, tier: PricingTier, onProgress: (pct: number) => void): Promise<void>` — resizes per tier then POSTs to `/api/guest/upload`; resolves on success, throws `Error(message)` on failure.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/uploadImageToServer.test.ts
jest.mock('@/lib/csrf-client', () => ({
  uploadWithCsrfRetry: jest.fn(),
}));
import { uploadImageFile } from '@/lib/uploadImageToServer';
import { uploadWithCsrfRetry } from '@/lib/csrf-client';

describe('uploadImageFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs a small image (no resize) and reports progress, resolving on 200', async () => {
    (uploadWithCsrfRetry as jest.Mock).mockImplementation(async (_url, _fd, opts) => {
      opts.onProgress?.(100);
      return { ok: true, json: async () => ({ success: true, uploaded: 1 }) };
    });
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    const progress: number[] = [];
    await expect(uploadImageFile(file, 'free', (p) => progress.push(p))).resolves.toBeUndefined();
    expect(uploadWithCsrfRetry).toHaveBeenCalledWith('/api/guest/upload', expect.any(FormData), expect.objectContaining({ csrfEndpoint: '/api/guest/upload' }));
    expect(progress).toContain(100);
  });

  it('throws the server error message on a non-ok response', async () => {
    (uploadWithCsrfRetry as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Limit' }) });
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    await expect(uploadImageFile(file, 'free', () => {})).rejects.toThrow('Limit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- uploadImageToServer.test.ts`
Expected: FAIL — `Cannot find module '@/lib/uploadImageToServer'`.

- [ ] **Step 3: Implement the helper** (move `resizeImage` verbatim from `Upload-Form.tsx:189-255`; wrap the upload)

```ts
// lib/uploadImageToServer.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- uploadImageToServer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/uploadImageToServer.ts __tests__/lib/uploadImageToServer.test.ts
git commit -m "feat(guest): extract reusable single-image upload helper"
```

---

### Task 2: Video flow helper (`lib/uploadVideoFlow.ts`)

Extract the sign → Cloudinary → confirm sequence (currently inline in `VideoUploadForm.onPick`) into a reusable helper so `UnifiedUploadForm` can run one video at a time through the unified status list.

**Files:**
- Create: `lib/uploadVideoFlow.ts`
- Test: `__tests__/lib/uploadVideoFlow.test.ts`

**Interfaces:**
- Consumes: `fetchWithCsrfRetry` from `@/lib/csrf-client`, `uploadVideoToCloudinary` + `VideoSignData` from `@/lib/uploadVideoToCloudinary`.
- Produces: `uploadVideoFlow(file: File, onProgress: (pct: number) => void): Promise<void>` — signs, uploads to Cloudinary (progress driven by the XHR), confirms; resolves on success, throws `Error(message)` on failure. (Duration pre-check is the picker's responsibility, not this helper's.)

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/uploadVideoFlow.test.ts
jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn() }));
jest.mock('@/lib/uploadVideoToCloudinary', () => ({
  uploadVideoToCloudinary: jest.fn(),
}));
import { uploadVideoFlow } from '@/lib/uploadVideoFlow';
import { fetchWithCsrfRetry } from '@/lib/csrf-client';
import { uploadVideoToCloudinary } from '@/lib/uploadVideoToCloudinary';

const file = () => new File([new Uint8Array(10)], 'v.mp4', { type: 'video/mp4' });

beforeEach(() => jest.clearAllMocks());

it('signs, uploads, confirms — resolves on success', async () => {
  (fetchWithCsrfRetry as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ signature: 's', timestamp: 1, apiKey: 'k', cloudName: 'c', folder: 'wedding-app/videos' }) }) // sign
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // confirm
  (uploadVideoToCloudinary as jest.Mock).mockResolvedValue({ publicId: 'wedding-app/videos/x', secureUrl: 'https://res.cloudinary.com/c/video/upload/x.mp4' });
  await expect(uploadVideoFlow(file(), () => {})).resolves.toBeUndefined();
  expect(uploadVideoToCloudinary).toHaveBeenCalled();
  expect(fetchWithCsrfRetry).toHaveBeenLastCalledWith('/api/guest/upload/video-confirm', expect.objectContaining({ method: 'POST' }));
});

it('throws the confirm error message', async () => {
  (fetchWithCsrfRetry as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ signature: 's', timestamp: 1, apiKey: 'k', cloudName: 'c', folder: 'f' }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Već zabilježen' }) });
  (uploadVideoToCloudinary as jest.Mock).mockResolvedValue({ publicId: 'wedding-app/videos/x', secureUrl: 'u' });
  await expect(uploadVideoFlow(file(), () => {})).rejects.toThrow('Već zabilježen');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- uploadVideoFlow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// lib/uploadVideoFlow.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- uploadVideoFlow.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/uploadVideoFlow.ts __tests__/lib/uploadVideoFlow.test.ts
git commit -m "feat(guest): extract reusable video upload flow helper"
```

---

### Task 3: Staged mixed picker (`components/guest/MediaUpload.tsx`)

One dropzone that accepts images and (when allowed) videos, staging a mixed list with per-kind limits and a video duration pre-check.

**Files:**
- Create: `components/guest/MediaUpload.tsx`
- Test: `__tests__/components/MediaUpload.test.tsx`

**Interfaces:**
- Consumes: `readVideoDuration` from `@/lib/uploadVideoToCloudinary`, `MAX_VIDEO_DURATION_SEC` from `@/lib/video-config`, `react-dropzone`.
- Produces:
  - `export type StagedMedia = { id: string; file: File; kind: 'image' | 'video'; preview: string };`
  - `export function MediaUpload(props: { value: StagedMedia[]; onChange: (items: StagedMedia[]) => void; imageSlotsLeft: number; videoSlotsLeft: number; allowVideo: boolean; language?: string; onReject?: (msg: string) => void }): JSX.Element`
- Behavior: `kind = file.type.startsWith('video/') ? 'video' : 'image'`. Reject (via `onReject`) and skip a file when: its kind has 0 slots left, or a video's `readVideoDuration(file) > MAX_VIDEO_DURATION_SEC`. Accepted images get `preview = URL.createObjectURL(file)`; videos get `preview = ''` (status list / picker shows a video icon). Each staged item has an X to remove.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/MediaUpload.test.tsx
import { render, screen } from '@testing-library/react';
import { MediaUpload, type StagedMedia } from '@/components/guest/MediaUpload';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/lib/uploadVideoToCloudinary', () => ({ readVideoDuration: jest.fn().mockResolvedValue(10) }));

it('renders the dropzone label', () => {
  render(<MediaUpload value={[]} onChange={() => {}} imageSlotsLeft={25} videoSlotsLeft={3} allowVideo={true} />);
  expect(screen.getByTestId('media-dropzone')).toBeInTheDocument();
});

it('lists staged items with a remove control', () => {
  const items: StagedMedia[] = [
    { id: '1', file: new File([''], 'a.jpg', { type: 'image/jpeg' }), kind: 'image', preview: 'blob:a' },
    { id: '2', file: new File([''], 'v.mp4', { type: 'video/mp4' }), kind: 'video', preview: '' },
  ];
  render(<MediaUpload value={items} onChange={() => {}} imageSlotsLeft={24} videoSlotsLeft={2} allowVideo={true} />);
  expect(screen.getAllByLabelText(/ukloni|remove/i).length).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- MediaUpload.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// components/guest/MediaUpload.tsx
"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { readVideoDuration } from "@/lib/uploadVideoToCloudinary";
import { MAX_VIDEO_DURATION_SEC } from "@/lib/video-config";

export type StagedMedia = { id: string; file: File; kind: "image" | "video"; preview: string };

interface MediaUploadProps {
  value: StagedMedia[];
  onChange: (items: StagedMedia[]) => void;
  imageSlotsLeft: number;
  videoSlotsLeft: number;
  allowVideo: boolean;
  language?: string;
  onReject?: (msg: string) => void;
}

let _seq = 0;
const nextId = () => `m-${Date.now()}-${_seq++}`;

export function MediaUpload({ value, onChange, imageSlotsLeft, videoSlotsLeft, allowVideo, language = "sr", onReject }: MediaUploadProps) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const staged: StagedMedia[] = [...value];
      let imgLeft = imageSlotsLeft - staged.filter((s) => s.kind === "image").length;
      let vidLeft = videoSlotsLeft - staged.filter((s) => s.kind === "video").length;

      for (const file of accepted) {
        const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
        if (kind === "video") {
          if (!allowVideo || vidLeft <= 0) { onReject?.(t("guest.mediaUpload.videoLimit", "Dostigli ste maksimalan broj videa.")); continue; }
          let duration = 0;
          try { duration = await readVideoDuration(file); } catch { onReject?.(t("guest.mediaUpload.videoUnreadable", "Video se ne može pročitati.")); continue; }
          if (duration > MAX_VIDEO_DURATION_SEC) { onReject?.(t("guest.videoUpload.tooLong", "Video može trajati najviše {{sec}} sekundi.", { sec: MAX_VIDEO_DURATION_SEC })); continue; }
          staged.push({ id: nextId(), file, kind, preview: "" });
          vidLeft--;
        } else {
          if (imgLeft <= 0) { onReject?.(t("guest.mediaUpload.imageLimit", "Dostigli ste maksimalan broj slika.")); continue; }
          staged.push({ id: nextId(), file, kind, preview: URL.createObjectURL(file) });
          imgLeft--;
        }
      }
      onChange(staged);
    },
    [value, onChange, imageSlotsLeft, videoSlotsLeft, allowVideo, onReject, t]
  );

  const accept = allowVideo
    ? { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic", ".heif"], "video/*": [] }
    : { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic", ".heif"] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });

  function remove(id: string) {
    const item = value.find((s) => s.id === id);
    if (item?.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    onChange(value.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        data-testid="media-dropzone"
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-primary))]/10" : "border-[hsl(var(--lp-muted-foreground))]/20 hover:border-[hsl(var(--lp-primary))]/50"
        }`}
      >
        <input {...getInputProps()} data-testid="media-input" />
        <Upload className="mx-auto h-10 w-10 text-[hsl(var(--lp-muted-foreground))]" />
        <p className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
          {allowVideo
            ? t("guest.mediaUpload.dragOrClick", "Prevucite slike i video ovdje ili kliknite za odabir")
            : t("guest.imageUpload.dragOrClick", "Prevucite slike ovdje ili kliknite za odabir")}
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/20">
              {item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[hsl(var(--lp-muted-foreground))] gap-1">
                  <VideoIcon className="h-7 w-7" />
                  <span className="text-[10px] px-1 truncate max-w-full">{item.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t("guest.mediaUpload.remove", "Ukloni")}
                className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-1 text-[hsl(var(--lp-destructive))] shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/50 text-white rounded px-1 text-[10px] flex items-center gap-0.5">
                {item.kind === "image" ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- MediaUpload.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/guest/MediaUpload.tsx __tests__/components/MediaUpload.test.tsx
git commit -m "feat(guest): staged mixed-media picker with per-kind limits + duration pre-check"
```

---

### Task 4: Extend `UploadStatusList` to render video rows

The status list already renders a generic progress bar per row — that delivers the missing video progress bar. It only needs to render a video icon instead of a `next/image` thumbnail for video rows.

**Files:**
- Modify: `components/guest/UploadStatusList.tsx`
- Test: `__tests__/components/UploadStatusList-video.test.tsx`

**Interfaces:**
- Produces (amended): `ImageUploadStatus` gains `kind?: 'image' | 'video'` (optional, defaults to image-style rendering for back-compat with `Upload-Form.tsx`).

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/UploadStatusList-video.test.tsx
import { render, screen } from '@testing-library/react';
import { UploadStatusList, type ImageUploadStatus } from '@/components/guest/UploadStatusList';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));

it('renders a video row without a next/image thumbnail and shows its progress bar', () => {
  const statuses: ImageUploadStatus[] = [
    { id: 'v1', file: new File([''], 'clip.mp4', { type: 'video/mp4' }), kind: 'video', status: 'uploading', progress: 42 },
  ];
  render(<UploadStatusList uploadStatuses={statuses} isLoading onRetryUpload={() => {}} onRetryAllFailed={() => {}} />);
  expect(screen.getByText('clip.mp4')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- UploadStatusList-video.test.tsx`
Expected: FAIL — TS error: `kind` is not a property of `ImageUploadStatus` (or the video thumbnail branch doesn't exist yet).

- [ ] **Step 3: Implement the change**

In `components/guest/UploadStatusList.tsx`, add `kind?: 'image' | 'video';` to the `ImageUploadStatus` type (after `retryable?`), import `Video as VideoIcon` from `lucide-react`, and replace the thumbnail block (the `{status.preview && (…<Image…/>…)}` div) with:

```tsx
                {/* Thumbnail — image preview, or a video icon for video rows */}
                {status.kind === 'video' ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/20 flex items-center justify-center text-[hsl(var(--lp-muted-foreground))]">
                    <VideoIcon className="h-5 w-5" />
                  </div>
                ) : (
                  status.preview && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/20">
                      <Image
                        src={status.preview}
                        alt={t('guest.uploadStatus.imagePreview', 'Pregled slike')}
                        className="w-full h-full object-cover"
                        width={40}
                        height={40}
                        unoptimized={status.preview.startsWith('blob:') || status.preview.startsWith('data:')}
                      />
                    </div>
                  )
                )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- UploadStatusList-video.test.tsx`
Expected: PASS. Also run `pnpm test:unit -- UploadStatusList` if other status-list tests exist; expect green (the `kind` field is optional, image rows unchanged).

- [ ] **Step 5: Commit**

```bash
git add components/guest/UploadStatusList.tsx __tests__/components/UploadStatusList-video.test.tsx
git commit -m "feat(guest): UploadStatusList renders video rows (icon + progress bar)"
```

---

### Task 5: Unified orchestrator (`components/guest/UnifiedUploadForm.tsx`)

The staged form: header with two counters, `MediaUpload`, optional message, one "Potvrdi upload". On submit it splits the staged list by kind and runs both pipelines in parallel through `UploadStatusList`.

**Files:**
- Create: `components/guest/UnifiedUploadForm.tsx`
- Test: `__tests__/components/UnifiedUploadForm.test.tsx`

**Interfaces:**
- Consumes: `MediaUpload` + `StagedMedia` (Task 3), `uploadImageFile` (Task 1), `uploadVideoFlow` (Task 2), `UploadStatusList` + `ImageUploadStatus` (Task 4), `fetchWithCsrfRetry`, `MAX_VIDEO_DURATION_SEC`.
- Produces: `export function UnifiedUploadForm(props: { guestId: string; message?: string; language?: string; imageLimit: number; videoLimit: number; tier: PricingTier; existingImageCount: number; existingVideoCount: number }): JSX.Element`
- Behavior: on submit, send the message once (if present) via `POST /api/guest/upload` (message-only path); map each `StagedMedia` to an `ImageUploadStatus` row (`kind` carried through, `preview` from the staged item); run `uploadImageFile`/`uploadVideoFlow` per item in parallel, updating each row's progress/status; per-item failure isolates with retry; on all-success redirect to `/{lang}/guest/success`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/UnifiedUploadForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedUploadForm } from '@/components/guest/UnifiedUploadForm';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => (typeof d === 'string' ? d : _k), i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/lib/uploadImageToServer', () => ({ uploadImageFile: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/uploadVideoFlow', () => ({ uploadVideoFlow: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) }));
// Render the real MediaUpload but stub its file-reading dependency:
jest.mock('@/lib/uploadVideoToCloudinary', () => ({ readVideoDuration: jest.fn().mockResolvedValue(10) }));

import { uploadImageFile } from '@/lib/uploadImageToServer';
import { uploadVideoFlow } from '@/lib/uploadVideoFlow';

// jsdom: stub navigation
const origLocation = window.location;
beforeAll(() => { Object.defineProperty(window, 'location', { writable: true, value: { ...origLocation, href: '' } }); });
afterAll(() => { Object.defineProperty(window, 'location', { writable: true, value: origLocation }); });

it('renders both counters when video is allowed', () => {
  render(<UnifiedUploadForm guestId="g" language="sr" imageLimit={25} videoLimit={3} tier="premium" existingImageCount={1} existingVideoCount={0} />);
  expect(screen.getByText(/1\s*\/\s*25/)).toBeInTheDocument();
  expect(screen.getByText(/0\s*\/\s*3/)).toBeInTheDocument();
});

it('dispatches each staged item to its pipeline on submit', async () => {
  render(<UnifiedUploadForm guestId="g" language="sr" imageLimit={25} videoLimit={3} tier="premium" existingImageCount={0} existingVideoCount={0} />);
  // Inject a mixed selection through the hidden dropzone input
  const input = screen.getByTestId('media-input') as HTMLInputElement;
  const img = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
  const vid = new File([new Uint8Array(10)], 'v.mp4', { type: 'video/mp4' });
  fireEvent.change(input, { target: { files: [img, vid] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /potvrdi/i })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: /potvrdi/i }));
  await waitFor(() => {
    expect(uploadImageFile).toHaveBeenCalledTimes(1);
    expect(uploadVideoFlow).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- UnifiedUploadForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// components/guest/UnifiedUploadForm.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MediaUpload, type StagedMedia } from "@/components/guest/MediaUpload";
import { UploadStatusList, type ImageUploadStatus } from "@/components/guest/UploadStatusList";
import { ModalPortal } from "@/components/shared/ModalPortal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { uploadImageFile } from "@/lib/uploadImageToServer";
import { uploadVideoFlow } from "@/lib/uploadVideoFlow";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import type { PricingTier } from "@/lib/pricing-tiers";

interface UnifiedUploadFormProps {
  guestId: string;
  message?: string;
  language?: string;
  imageLimit: number;
  videoLimit: number;
  tier: PricingTier;
  existingImageCount: number;
  existingVideoCount: number;
}

export function UnifiedUploadForm({ guestId, message: initialMessage = "", language = "sr", imageLimit, videoLimit, tier, existingImageCount, existingVideoCount }: UnifiedUploadFormProps) {
  const { t } = useTranslation();
  const allowVideo = videoLimit > 0;

  const [staged, setStaged] = useState<StagedMedia[]>([]);
  const [message, setMessage] = useState(initialMessage);
  const [statuses, setStatuses] = useState<ImageUploadStatus[]>([]);
  const [showStatus, setShowStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useLockBodyScroll(showStatus);

  const stagedImages = staged.filter((s) => s.kind === "image").length;
  const stagedVideos = staged.filter((s) => s.kind === "video").length;
  const imageSlotsLeft = Math.max(0, imageLimit - existingImageCount - stagedImages);
  const videoSlotsLeft = Math.max(0, videoLimit - existingVideoCount - stagedVideos);

  async function runItem(s: ImageUploadStatus): Promise<boolean> {
    const setProgress = (pct: number) =>
      setStatuses((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "uploading", progress: pct, retryable: false } : x)));
    try {
      setProgress(0);
      const item = staged.find((m) => m.id === s.id)!;
      if (item.kind === "image") await uploadImageFile(item.file, tier, setProgress);
      else await uploadVideoFlow(item.file, setProgress);
      setStatuses((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "success", progress: 100 } : x)));
      return true;
    } catch (err) {
      setStatuses((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "error", error: err instanceof Error ? err.message : "Greška", retryable: true } : x)));
      return false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (staged.length === 0) { setNotice(t("guest.mediaUpload.pickSomething", "Izaberite bar jednu sliku ili video.")); return; }

    setIsLoading(true);
    setShowStatus(true);
    const initial: ImageUploadStatus[] = staged.map((m) => ({ id: m.id, file: m.file, kind: m.kind, status: "waiting", progress: 0, preview: m.preview }));
    setStatuses(initial);

    if (message.trim()) {
      const fd = new FormData();
      fd.append("message", message);
      await fetchWithCsrfRetry("/api/guest/upload", { method: "POST", body: fd, csrfEndpoint: "/api/guest/upload" }).catch(() => {});
    }

    const results = await Promise.all(initial.map((s) => runItem(s)));
    if (results.every(Boolean)) {
      setTimeout(() => { window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success"; }, 1200);
    } else {
      setIsLoading(false);
    }
  }

  async function retryOne(id: string) {
    const s = statuses.find((x) => x.id === id);
    if (!s) return;
    setIsLoading(true);
    await runItem(s);
    setStatuses((prev) => {
      if (prev.every((x) => x.status === "success")) {
        setTimeout(() => { window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success"; }, 1200);
      } else {
        setIsLoading(false);
      }
      return prev;
    });
  }

  async function retryAll() {
    const failed = statuses.filter((x) => x.status === "error" && x.retryable);
    if (failed.length === 0) return;
    setIsLoading(true);
    await Promise.all(failed.map((s) => runItem(s)));
    setStatuses((prev) => {
      if (prev.every((x) => x.status === "success")) {
        setTimeout(() => { window.location.href = language === "en" ? "/en/guest/success" : "/sr/guest/success"; }, 1200);
      } else {
        setIsLoading(false);
      }
      return prev;
    });
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      {notice && (
        <div className="p-4 border-b border-gray-200">
          <Alert variant="destructive" className="flex items-center justify-between">
            <div className="flex items-center"><AlertCircle className="h-4 w-4 mr-2" /><AlertDescription>{notice}</AlertDescription></div>
            <button onClick={() => setNotice("")} aria-label={t("guest.mediaUpload.dismiss", "Zatvori")}><X className="h-4 w-4" /></button>
          </Alert>
        </div>
      )}

      {showStatus && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b border-[hsl(var(--lp-accent))]/10">
                <h3 className="text-[hsl(var(--lp-primary))] text-lg font-semibold">{t("guest.mediaUpload.uploadingTitle", "Slanje uspomena")}</h3>
              </div>
              <UploadStatusList uploadStatuses={statuses} isLoading={isLoading} onRetryUpload={retryOne} onRetryAllFailed={retryAll} language={language} />
            </div>
          </div>
        </ModalPortal>
      )}

      <CardHeader>
        <CardTitle>{t("guest.mediaUpload.title", "Dodaj uspomene")}</CardTitle>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
          {t("guest.mediaUpload.counterImages", "Slike {{count}}/{{limit}}", { count: existingImageCount + stagedImages, limit: imageLimit })}
          {allowVideo && (
            <> {" · "} {t("guest.mediaUpload.counterVideos", "Video {{count}}/{{limit}}", { count: existingVideoCount + stagedVideos, limit: videoLimit })}</>
          )}
        </p>
      </CardHeader>

      <form onSubmit={onSubmit} aria-busy={isLoading}>
        <CardContent className="space-y-6">
          <MediaUpload
            value={staged}
            onChange={setStaged}
            imageSlotsLeft={imageSlotsLeft}
            videoSlotsLeft={videoSlotsLeft}
            allowVideo={allowVideo}
            language={language}
            onReject={(msg) => setNotice(msg)}
          />
          <div>
            <label className="block font-medium mb-1">{t("guest.uploadForm.messageOptional", "Poruka (opciono)")}</label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("guest.uploadForm.messagePlaceholder", "Napišite poruku ili čestitku mladencima...")} />
            <p className="text-sm text-[hsl(var(--lp-muted-foreground))] mt-1">{t("guest.uploadForm.maxChars", "Maksimalno 500 karaktera")}</p>
          </div>
        </CardContent>
        <CardFooter className="px-4 py-6 sm:px-6">
          <Button type="submit" className="w-full py-6 sm:py-4" disabled={isLoading || staged.length === 0}>
            {isLoading ? t("guest.uploadForm.sending", "Slanje...") : t("guest.uploadForm.confirmUpload", "Potvrdi upload")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- UnifiedUploadForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/guest/UnifiedUploadForm.tsx __tests__/components/UnifiedUploadForm.test.tsx
git commit -m "feat(guest): unified staged upload orchestrator (images + videos)"
```

---

### Task 6: Merged gallery (`components/guest/MediaGallery.tsx`)

One grid mixing image and video tiles, sorted by `createdAt` desc, each deleting via the correct endpoint.

**Files:**
- Create: `components/guest/MediaGallery.tsx`
- Test: `__tests__/components/MediaGallery.test.tsx`

**Interfaces:**
- Consumes: `fetchWithCsrfRetry`, `ImageWithSpinner` from `@/components/shared/ImageWithSpinner`.
- Produces:
  - `export interface GalleryImage { id: string; imageUrl: string; storagePath?: string; createdAt: string }`
  - `export interface GalleryVideo { id: string; videoUrl: string; posterUrl: string; durationSec: number; createdAt: string }`
  - `export function MediaGallery(props: { images: GalleryImage[]; videos: GalleryVideo[]; guestId: string; language?: string; onImagesChange?: (i: GalleryImage[]) => void; onVideosChange?: (v: GalleryVideo[]) => void }): JSX.Element`
- Behavior: merge into `{ kind, createdAt, ...}[]`, sort by `createdAt` desc; image tile → `ImageWithSpinner`; video tile → `<video controls preload="metadata" poster src>`; delete dispatches image → `DELETE /api/guest/images/delete?id=`, video → `DELETE /api/guest/videos/delete?id=`; on ok, drop from local state and notify the parent.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/MediaGallery.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaGallery } from '@/components/guest/MediaGallery';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/components/shared/ImageWithSpinner', () => ({ __esModule: true, default: (p: any) => <img alt={p.alt} src={p.src} /> }));
jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) }) }));
import { fetchWithCsrfRetry } from '@/lib/csrf-client';

const images = [{ id: 'i1', imageUrl: 'https://res.cloudinary.com/x/a.jpg', createdAt: '2026-06-01T00:00:00Z' }];
const videos = [{ id: 'v1', videoUrl: 'https://res.cloudinary.com/x/v.mp4', posterUrl: 'https://res.cloudinary.com/x/v.jpg', durationSec: 20, createdAt: '2026-06-02T00:00:00Z' }];

it('renders both an image and a video tile', () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" />);
  expect(screen.getByRole('img')).toBeInTheDocument();
  expect(document.querySelector('video')).toBeInTheDocument();
});

it('deletes a video via the video endpoint', async () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" />);
  fireEvent.click(screen.getByLabelText(/obriši video|delete video/i));
  await waitFor(() => expect(fetchWithCsrfRetry).toHaveBeenCalledWith(expect.stringContaining('/api/guest/videos/delete?id=v1'), expect.objectContaining({ method: 'DELETE' })));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- MediaGallery.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// components/guest/MediaGallery.tsx
"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trash, Loader2 } from "lucide-react";
import ImageWithSpinner from "@/components/shared/ImageWithSpinner";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import { useTranslation } from "react-i18next";

export interface GalleryImage { id: string; imageUrl: string; storagePath?: string; createdAt: string }
export interface GalleryVideo { id: string; videoUrl: string; posterUrl: string; durationSec: number; createdAt: string }

type MediaItem =
  | ({ kind: "image" } & GalleryImage)
  | ({ kind: "video" } & GalleryVideo);

interface MediaGalleryProps {
  images: GalleryImage[];
  videos: GalleryVideo[];
  guestId: string;
  language?: string;
  onImagesChange?: (i: GalleryImage[]) => void;
  onVideosChange?: (v: GalleryVideo[]) => void;
}

export function MediaGallery({ images, videos, guestId, language = "sr", onImagesChange, onVideosChange }: MediaGalleryProps) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const items: MediaItem[] = [
    ...images.map((i) => ({ kind: "image" as const, ...i })),
    ...videos.map((v) => ({ kind: "video" as const, ...v })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (items.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">{t("guest.mediaGallery.empty", "Nema uploadovanih uspomena")}</div>;
  }

  async function remove(item: MediaItem) {
    if (deleting.has(item.id)) return;
    setDeleting((p) => new Set(p).add(item.id));
    const endpoint = item.kind === "image" ? `/api/guest/images/delete?id=${item.id}` : `/api/guest/videos/delete?id=${item.id}`;
    const csrfEndpoint = item.kind === "image" ? "/api/guest/images/delete" : "/api/guest/videos/delete";
    try {
      const res = await fetchWithCsrfRetry(endpoint, { method: "DELETE", csrfEndpoint });
      if (res.ok || res.status === 404) {
        if (item.kind === "image") onImagesChange?.(images.filter((x) => x.id !== item.id));
        else onVideosChange?.(videos.filter((x) => x.id !== item.id));
      }
    } finally {
      setDeleting((p) => { const n = new Set(p); n.delete(item.id); return n; });
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((item) => {
        const isDeleting = deleting.has(item.id);
        return (
          <Card key={`${item.kind}-${item.id}`} className="relative aspect-square overflow-hidden group bg-white border border-[hsl(var(--lp-accent))] shadow-lg rounded-xl">
            <button
              onClick={(e) => { e.stopPropagation(); remove(item); }}
              disabled={isDeleting}
              aria-label={item.kind === "image" ? t("guest.imageGallery.deleteImage", "Obriši sliku") : t("guest.videoGallery.delete", "Obriši video")}
              className="absolute top-2 right-2 z-20 h-8 w-8 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center text-[hsl(var(--lp-destructive))]"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            </button>
            {item.kind === "image" ? (
              <ImageWithSpinner src={item.imageUrl} width={400} height={400} crop="fill" alt={t("guest.imageGallery.guestImage", "Slika gosta")} className="p-2" rounded={true} />
            ) : (
              <video controls preload="metadata" poster={item.posterUrl || undefined} src={item.videoUrl} className="w-full h-full object-cover" />
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- MediaGallery.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/guest/MediaGallery.tsx __tests__/components/MediaGallery.test.tsx
git commit -m "feat(guest): merged media gallery (images + videos) with per-kind delete"
```

---

### Task 7: Rewire `DashboardClient` + dashboard page + i18n; retire old sections

Wire the new components in, add `createdAt` to the gallery data, add the new i18n keys to both locales, and remove the now-unused `VideoUploadForm`/`VideoGallery` usage.

**Files:**
- Modify: `components/guest/DashboardClient.tsx`
- Modify: `app/guest/dashboard/page.tsx`
- Modify: `locales/sr/translation.json`, `locales/en/translation.json`

**Interfaces:**
- Consumes: `UnifiedUploadForm` (Task 5), `MediaGallery` + `GalleryImage`/`GalleryVideo` (Task 6).

- [ ] **Step 1: Add `createdAt` to the dashboard's media mapping**

In `app/guest/dashboard/page.tsx`, the `prisma.guest.findUnique` already includes `images` and `videos`. Map `createdAt` (ISO string) into both props:

```tsx
        initialImages={(guestWithData?.images ?? []).map((i) => ({
          id: i.id, imageUrl: i.imageUrl, storagePath: i.storagePath ?? undefined, createdAt: i.createdAt.toISOString(),
        }))}
        initialVideos={(guestWithData?.videos ?? []).map((v) => ({
          id: v.id, videoUrl: v.videoUrl, posterUrl: v.posterUrl, durationSec: v.durationSec, createdAt: v.createdAt.toISOString(),
        }))}
```

(If the existing `initialImages` map omits `createdAt`, add it as shown. `Image.createdAt` and `Video.createdAt` both exist on the Prisma models.)

- [ ] **Step 2: Rewire `DashboardClient`**

Replace the body of `components/guest/DashboardClient.tsx` so it renders one `UnifiedUploadForm` + one `MediaGallery`. Update the `Image` interface to include `createdAt: string`, import the new components and `GalleryImage`/`GalleryVideo`, and gate the celebration on BOTH kinds being full:

```tsx
"use client"

import React, { useEffect, useState } from 'react'
import { UnifiedUploadForm } from '@/components/guest/UnifiedUploadForm'
import { MediaGallery, type GalleryImage, type GalleryVideo } from '@/components/guest/MediaGallery'
import { UploadLimitReachedCelebration } from '@/components/guest/UploadLimitReachedCelebration'
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";
import { useTranslation } from 'react-i18next'
import type { PricingTier } from '@/lib/pricing-tiers'

interface DashboardClientProps {
  initialImages: GalleryImage[]
  guestId: string
  message?: string
  language?: string
  imageLimit?: number
  tier?: PricingTier
  initialVideos?: GalleryVideo[]
  videoLimit?: number
}

export function DashboardClient({ initialImages, guestId, message, language = 'sr', imageLimit = 10, tier = 'free', initialVideos = [], videoLimit = 0 }: DashboardClientProps) {
  const { i18n } = useTranslation();
  useEffect(() => { if (language && i18n.language !== language) i18n.changeLanguage(language); }, [language, i18n]);

  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [videos, setVideos] = useState<GalleryVideo[]>(initialVideos)

  useEffect(() => { if (guestId) localStorage.setItem("guestId", guestId); }, [guestId]);

  const imagesFull = images.length >= imageLimit;
  const videosFull = videoLimit === 0 || videos.length >= videoLimit;
  const everythingFull = imagesFull && videosFull;

  return (
    <>
      <AddToHomeScreenPrompt />
      <div className="mb-8">
        {everythingFull ? (
          <UploadLimitReachedCelebration imagesCount={images.length} language={language} imageLimit={imageLimit} />
        ) : (
          <UnifiedUploadForm
            guestId={guestId}
            message={message}
            language={language}
            imageLimit={imageLimit}
            videoLimit={videoLimit}
            tier={tier}
            existingImageCount={images.length}
            existingVideoCount={videos.length}
          />
        )}
      </div>

      <MediaGallery
        images={images}
        videos={videos}
        guestId={guestId}
        language={language}
        onImagesChange={setImages}
        onVideosChange={setVideos}
      />
    </>
  )
}
```

- [ ] **Step 3: Add the new i18n keys to BOTH locales**

In `locales/sr/translation.json` under `guest`, add a `mediaUpload` block and a `mediaGallery` block (mirror in `en`). SR values:

```json
"mediaUpload": {
  "title": "Dodaj uspomene",
  "dragOrClick": "Prevucite slike i video ovdje ili kliknite za odabir",
  "counterImages": "Slike {{count}}/{{limit}}",
  "counterVideos": "Video {{count}}/{{limit}}",
  "uploadingTitle": "Slanje uspomena",
  "remove": "Ukloni",
  "dismiss": "Zatvori",
  "pickSomething": "Izaberite bar jednu sliku ili video.",
  "imageLimit": "Dostigli ste maksimalan broj slika.",
  "videoLimit": "Dostigli ste maksimalan broj videa.",
  "videoUnreadable": "Video se ne može pročitati."
},
"mediaGallery": {
  "empty": "Nema uploadovanih uspomena"
}
```

EN values: "Add memories", "Drag images and videos here or click to select", "Photos {{count}}/{{limit}}", "Videos {{count}}/{{limit}}", "Uploading memories", "Remove", "Close", "Select at least one photo or video.", "You have reached the maximum number of photos.", "You have reached the maximum number of videos.", "The video could not be read.", and `mediaGallery.empty` → "No uploaded memories".

- [ ] **Step 4: Remove the now-unused components**

`components/guest/VideoUploadForm.tsx` and `components/guest/VideoGallery.tsx` are no longer referenced (verify with `grep -rn "VideoUploadForm\|VideoGallery" components app __tests__`). If the only remaining references are their own test files, delete the components AND their tests. `ImageGallery.tsx` and `Upload-Form.tsx`: leave them in place only if still referenced elsewhere; otherwise delete them and their tests too. Do NOT delete `UploadStatusList`, `ImageUpload` is replaced by `MediaUpload` — delete `ImageUpload.tsx` + its test only if no remaining references.

```bash
grep -rn "VideoUploadForm\|VideoGallery\|Upload-Form\|ImageGallery\|ImageUpload" components app __tests__ | grep -v "MediaGallery\|MediaUpload\|UnifiedUploadForm"
```

Delete each file (and its test) that the grep shows is now unreferenced.

- [ ] **Step 5: Verify**

```bash
node -e "require('./locales/sr/translation.json'); require('./locales/en/translation.json'); console.log('json ok')"
pnpm exec tsc --noEmit   # no NEW errors in touched files (ignore pre-existing admin/remotion/LanguageContext errors)
pnpm test:unit           # full suite green
```
Expected: json ok; no new tsc errors; full suite passes.

- [ ] **Step 6: Commit**

```bash
git add components/guest/DashboardClient.tsx app/guest/dashboard/page.tsx locales/sr/translation.json locales/en/translation.json
git add -A components/guest/__tests__ __tests__ 2>/dev/null || true
git commit -m "feat(guest): unify dashboard on single media uploader + gallery; retire split sections"
```

---

### Task 8: Manual device verification

Automated tests mock the pipelines; one real run on a phone confirms the unified flow end-to-end.

**Files:** none (verification task)

- [ ] **Step 1:** `pnpm exec next dev -H 0.0.0.0 -p 3000`; open `http://<LAN-IP>:3000/sr/guest/login?event=<premium-slug>` on a phone.
- [ ] **Step 2:** In one pick, select a mix of photos and a short video. Verify all appear as staged thumbnails (video shows a video icon), each removable.
- [ ] **Step 3:** Add a message, tap "Potvrdi upload". Verify one progress list shows both photos and the video, the **video row has a moving progress bar**, and on completion you land on `/guest/success`.
- [ ] **Step 4:** Back on the dashboard, verify the gallery shows photos and videos together (videos play inline), and deleting either kind removes it.
- [ ] **Step 5:** Verify the two counters read correctly and a >60s video is rejected at pick time with a message (no `{{…}}` literals anywhere).

---

## Self-review

**Spec coverage:** one picker + one gallery (Tasks 3,6,7) ✓; staged flow with single Potvrdi + parallel pipelines + one progress list (Tasks 1,2,4,5) ✓; two counters (Task 5) ✓; premium-gated video half (Tasks 3,5 via `allowVideo`/`videoLimit`) ✓; i18n interpolation fix (Tasks 3,5,7 pass interpolation objects) ✓; video progress bar (Task 4) ✓; merged sorted gallery + per-kind delete (Task 6) ✓; no backend changes ✓; celebration only when both kinds full (Task 7) ✓.

**Placeholder scan:** no TBD/TODO; every code step contains full code; commands have expected output.

**Type consistency:** `StagedMedia` (Task 3) consumed in Task 5; `ImageUploadStatus.kind?` (Task 4) set in Task 5; `uploadImageFile(file,tier,onProgress)` (Task 1) and `uploadVideoFlow(file,onProgress)` (Task 2) called in Task 5; `GalleryImage`/`GalleryVideo` (Task 6) consumed in Task 7's `DashboardClient` and produced by the dashboard page map (Task 7 Step 1) — both carry `createdAt: string`.
