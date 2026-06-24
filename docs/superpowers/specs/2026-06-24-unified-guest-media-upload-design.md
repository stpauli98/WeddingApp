# Unified Guest Media Upload — Design

**Date:** 2026-06-24
**Status:** Approved (design), pending implementation plan
**Scope:** Guest dashboard UI only. **No backend changes** — all API routes, limits, CSRF, CSP, and the two upload pipelines stay exactly as they are.

## Problem

The guest dashboard currently presents image upload and video upload as two disjoint sections (`Upload-Form.tsx` + `ImageGallery.tsx`, then `VideoUploadForm.tsx` + `VideoGallery.tsx`), separated by the image gallery, with inconsistent styling and two separate galleries. It reads as two different apps. Concrete defects (visible in the current build):

1. Two large separate cards ("Dodaj slike", "Dodaj video") with the image gallery sandwiched between → disjoint.
2. **i18n interpolation bug:** `VideoUploadForm` renders literal `{{limit}}`, `{{sec}}`, `{{remaining}}` because `t()` is called with a template-string default but no interpolation values object, while the JSON key carries `{{...}}` placeholders.
3. **No video progress bar:** video shows only a spinner + `%` text; images get a rich per-file progress list (`UploadStatusList`).
4. Separate galleries: images in a thumbnail grid, videos as full-width raw `<video>` players → inconsistent.
5. **Flow asymmetry:** images are staged then submitted via "Potvrdi upload"; videos upload immediately on pick.
6. Message + Confirm button belong to the image flow only but read as global.

## Goal

One cohesive "Dodaj uspomene" experience: a single staged picker that accepts images **and** videos, one unified progress list, one mixed media gallery. Each file is routed to its correct existing pipeline under the hood. The original "phone gallery only shows images" problem is also resolved because a single picker offers both photos and videos.

## Decisions (locked during brainstorming)

- **Approach:** one combined picker + one combined gallery (not tabs, not two harmonized sections).
- **Flow:** staged — pick a mix → all staged as removable thumbnails → one "Potvrdi upload" runs everything (images via image pipeline, videos via signed-upload), message sent once, one progress list.
- **Limits:** image and video limits remain separate; the header shows two counters (e.g. `Slike 1/25 · Video 0/3`).
- Premium-only video gating unchanged: the video half of the picker/counters appears only when `videoLimit > 0`.

## Architecture

Reuses both existing pipelines verbatim; only the guest-facing composition changes.

### Existing pipelines (unchanged)

- **Image:** client canvas resize (`resizeImage`, tier-aware) → `POST /api/guest/upload` (FormData, CSRF) → server Sharp + Cloudinary. Per-image one request, run in parallel.
- **Video:** `readVideoDuration` pre-check → `POST /api/guest/upload/video-sign` → `uploadVideoToCloudinary` (XHR direct to Cloudinary, real `onprogress`) → `POST /api/guest/upload/video-confirm`.

### Components

**`MediaUpload`** (new; supersedes `ImageUpload` in the guest flow)
- One `react-dropzone` (or styled input) with `accept` = image types **and**, when `videoLimit > 0`, `video/*`.
- Stages a mixed list. Each staged item: `{ id, file, kind: 'image' | 'video', preview }`. `kind` derived from `file.type` (`video/*` → video, else image).
- Preview: image → object-URL thumbnail; video → poster placeholder (🎥 / first-frame is optional, placeholder icon is acceptable).
- Per-item remove (X).
- **Client-side gating at add time:**
  - images: cannot exceed `imageLimit - existingImages - stagedImages`.
  - videos: cannot exceed `videoLimit - existingVideos - stagedVideos`.
  - video duration: `readVideoDuration(file) > MAX_VIDEO_DURATION_SEC` → reject that file with a translated message; do not stage it.
- Interface — Consumes: `imageLimit`, `videoLimit`, existing counts, `accept` config. Produces: `onChange(items: StagedMedia[])`.
- `StagedMedia = { id: string; file: File; kind: 'image' | 'video'; preview: string }`.

**`UnifiedUploadForm`** (evolution of `Upload-Form.tsx`)
- Holds the staged `StagedMedia[]` + optional message + single "Potvrdi upload".
- Header: title "Dodaj uspomene" + two counters via `ImageSlotBar`-style display: `Slike {imgCount}/{imageLimit}` and, when `videoLimit > 0`, `Video {vidCount}/{videoLimit}`.
- On submit:
  1. Build a unified status list: one `MediaUploadStatus` row per staged item (`{ id, kind, status, progress, error?, preview, retryable }`).
  2. Send the message once if present (existing `/api/guest/upload` message-only path).
  3. Run all items in parallel:
     - image item → `uploadSingleImage`-equivalent (resize → `POST /api/guest/upload`, progress via existing mechanism).
     - video item → `readVideoDuration` already done at stage time → sign → `uploadVideoToCloudinary(file, sign, onProgress)` → confirm; `onProgress` drives the row's bar.
  4. Update each row independently; one bad item isolates to its row with retry (mirrors current image retry).
  5. On all success → redirect to `/{lang}/guest/success` (existing behavior).
- Interface — Consumes: `guestId`, `message`, `language`, `imageLimit`, `videoLimit`, `tier`, existing image/video counts. Produces: navigation to success on completion; calls back to refresh gallery on partial success if staying on page.

**`UploadStatusList`** (extend)
- Render both kinds. Image row: thumbnail + bar. Video row: poster/🎥 + **real progress bar** (same visual as images, fed by XHR `onprogress`).
- Status semantics unchanged: `waiting | uploading | success | error`, with per-row retry for `error + retryable`.

**`MediaGallery`** (new; supersedes `ImageGallery` + `VideoGallery` in the guest flow)
- One responsive grid mixing image and video tiles, sorted by `createdAt` descending across both.
- Image tile: thumbnail, click → existing lightbox (`SwipeLightbox`).
- Video tile: `poster` + ▶ overlay; click → inline `<video controls>` (or lightbox variant). `preload="metadata"`.
- Per-tile delete dispatched to the correct endpoint: image → `DELETE /api/guest/images/delete?id=`, video → `DELETE /api/guest/videos/delete?id=`. On success, remove from local state.
- Interface — Consumes: `images: GuestImage[]`, `videos: GuestVideo[]`, `language`. Produces: local state updates on delete; no server changes.
- Tile model: a discriminated union `MediaItem = ({ kind: 'image' } & GuestImage) | ({ kind: 'video' } & GuestVideo)`, merged + sorted by `createdAt`.

**`DashboardClient`** (rewire)
- Renders exactly one `UnifiedUploadForm` and one `MediaGallery`.
- Removes the separate `{videoLimit > 0 && <section>…}` block and the standalone `ImageGallery`/`VideoUploadForm`/`VideoGallery` usage.
- Props unchanged from current (`initialImages`, `initialVideos`, `imageLimit`, `videoLimit`, `tier`, `guestId`, `message`, `language`).

### Data flow

```
pick (mixed)
  → MediaUpload stages StagedMedia[]  (per-kind limit + video duration pre-check)
  → "Potvrdi upload"
      → message (once, if present)
      → parallel per item:
          image → resize → POST /api/guest/upload         → row progress
          video → sign → XHR Cloudinary (onprogress) → confirm → row progress
      → all success → /{lang}/guest/success
gallery
  → MediaGallery merges images+videos, sorted by createdAt
  → delete dispatches to image or video endpoint by kind
```

## Error handling

- Per-item isolation: one failed image or video marks only its row `error` + `retryable`; others proceed (mirrors current image batch behavior).
- Retry: per-row retry re-runs that item's pipeline (image re-POST; video re-sign→upload→confirm).
- Video duration/size/format: client duration pre-check at stage time; server stays authoritative (confirm re-validates against Cloudinary metadata, destroys on reject).
- Limit races: client pre-gates per kind; servers remain authoritative (image limit in `/api/guest/upload`; video active+lifetime in sign/confirm).

## Bug fixes folded into this work

1. **i18n interpolation:** every `t(key, …)` for video strings passes the interpolation object (`{ limit, sec, remaining }` for the hint, `{ sec }` for tooLong). No more literal `{{…}}`.
2. **Video progress bar:** delivered by `UploadStatusList` rendering a bar for video rows fed by `uploadVideoToCloudinary`'s `onProgress`.
3. Consistent card styling, spacing, and a single gallery grid.

## Component boundaries (isolation)

- `MediaUpload` — staging + per-kind gating + previews. No server calls. Testable with file fixtures.
- `lib/uploadVideoToCloudinary` — already isolated (sign data in, `{publicId}` out). Reused.
- image per-file upload helper — extract the existing inline `uploadSingleImage` resize+POST into a reusable function so `UnifiedUploadForm` can call it per item without duplicating logic.
- `UnifiedUploadForm` — orchestration only; delegates to the two pipeline helpers + the status list.
- `UploadStatusList` — pure presentation of status rows (both kinds).
- `MediaGallery` — pure display + delete dispatch.

## Out of scope / non-goals

- No backend/API/schema/CSP changes.
- No combined single-request upload of images+videos (they keep separate pipelines; only the UI is unified).
- No new bulk video ZIP (admin download stays per-video).
- No change to the success page or admin dashboard.

## Testing

- `MediaUpload`: staging mixed files respects per-kind limits; a `>60s` video is rejected at add time; `kind` derived correctly from MIME.
- `UnifiedUploadForm`: submit splits by kind and calls the right pipeline per item; message sent once; all-success triggers redirect; one failed item isolates with retry.
- `MediaGallery`: merged sort order by `createdAt`; delete dispatches to the correct endpoint by kind and removes the tile.
- i18n: video strings render interpolated values (no literal `{{…}}`).
- Repo test reality: jest (`pnpm test:unit`); component tests with mocked fetch/CSRF as in existing guest component tests.
