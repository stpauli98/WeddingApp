# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WeddingApp** (`dodajuspomenu.com`) — multi-tenant SaaS where wedding couples (admins) create an event, share a QR/URL, and guests upload photos + a congratulations message. One admin owns exactly one event (enforced at API layer).

## Tech Stack

- **Next.js 15.3.9** (App Router) + React 18 + TypeScript (strict)
- **Prisma 6** on **PostgreSQL** (`@prisma/extension-optimize` for slow-query logging in dev)
- **Cloudinary** for image storage; **Sharp** for pre-upload optimization
- **Tailwind + Radix UI + shadcn/ui** (components.json)
- **i18next + react-i18next** (Serbian `sr` default, English `en`)
- **@edge-csrf/core** for CSRF
- **pnpm** is the canonical package manager (scripts defined accordingly)

## Commands

```bash
# Dev
pnpm dev

# Build (runs `prisma generate --no-engine && next build`)
pnpm build
pnpm start

# Tests
pnpm test:unit                              # Jest (all unit tests)
pnpm test:integration                       # Jest integration suite only
pnpm test:unit -- ImageUpload.test.tsx      # Single Jest file
pnpm test:unit -- -t "partial test name"    # By test name
npx playwright test                         # All E2E
npx playwright test e2e/homepage.spec.ts    # Single E2E spec
npx playwright test --ui                    # Playwright UI mode

# DB / Prisma
npx prisma migrate dev
npx prisma generate --no-engine             # Build uses --no-engine (Accelerate)
npx prisma studio

# Quality
pnpm lint
ANALYZE=true pnpm build                     # Bundle analyzer
```

**Backend testing note (from project RULES):** when testing the backend, always use Docker, and build Docker with the `.env` file (not `.env.local`).

## Architecture — Big Picture

### Multi-tenancy model
- Every wedding is an `Event` identified by a unique `slug`.
- Guest URLs are `/{lang}/guest/login?event={slug}` (QR codes encode this).
- **One `Admin` → one `Event` (1:1 via `adminId`)**. Creating a second event is rejected by `/api/admin/events`.
- All admin queries must filter by `admin.event.id` (server-side ownership check is mandatory — see `/lib/admin-auth.ts`).

### Two separate auth systems (do not conflate)

| | **Admin** | **Guest** |
|---|---|---|
| Cookie | `admin_session` (httpOnly, sameSite=lax) | `guest_session` (httpOnly) |
| Token | Opaque 32-byte hex in `AdminSession` table | Opaque 32-byte hex in `Guest.sessionToken` |
| Lifetime | **7 days** | **30 days** |
| Password? | Yes (bcrypt) | **No — auto-verified on first login** |
| Validator | `getAuthenticatedAdmin()` in `/lib/admin-auth.ts` | `getAuthenticatedGuest()` in `/lib/guest-auth.ts` |
| Rate limit | 5 login attempts / 15 min / IP (in-memory) | None |

> ⚠️ **`/lib/email.ts` is a stub** (`sendVerificationEmail` returns `Promise.resolve()`). Despite UI copy that may mention codes, **there is no email verification flow**. Guests provide name+email+event slug and are created/logged-in immediately.

### Middleware (`middleware.ts`) — does three things
1. **i18n URL rewrite:** `/{sr|en}/guest/...` → `/guest/...` internally while keeping the prefix in the browser; sets `i18nextLng` cookie (1 year).
2. **Double-prefix prevention:** `/sr/en/x` collapses to `/en/x`.
3. **Auth gating:** redirects to `/{lang}/{admin|guest}/login` if the appropriate session cookie is missing on protected paths (`/admin/dashboard`, `/guest/dashboard`, `/guest/success`). Middleware only checks cookie **presence**, not validity — the actual DB validation happens in `getAuthenticated*()` helpers.

### CSRF model
- `@edge-csrf/core` with `CSRF_SECRET` (base64). Per-action tokens stored in short-lived (30 min) httpOnly cookies: `csrf_token_guest_login`, `csrf_token_guest_upload`, `csrf_token_guest_delete`, etc.
- **Pattern:** GET the endpoint to receive a token, then POST/DELETE with the token in headers. Every state-changing route follows this.

### Photo upload pipeline (guest)
`Upload-Form.tsx` → client validates MIME/size (max 10 MB, allows JPEG/PNG/WebP/GIF/HEIC/HEIF) → **tier-aware canvas resize** (free=1280px @ 0.85q, basic=1600px @ 0.9q, premium=2560px @ 0.95q, unlimited=no resize) → optional EXIF strip (`/utils/removeExif.ts`) → POST FormData to `/api/guest/upload` → server re-auths via cookie, enforces `event.imageLimit` (tier-based per `/lib/pricing-tiers.ts`) AND `guest.lifetimeUploadCount` (2× imageLimit hard cap) → **Sharp** rotates per EXIF + strips metadata → **Cloudinary** upload: free/basic apply `{quality:auto}{fetch_format:auto}` incoming transformation (stored as compressed derivative); premium/unlimited upload WITHOUT transformation so the original is stored → `prisma.image.create({ imageUrl, storagePath, tier })`. The `tier` column snapshots the event's `pricingTier` at upload time so admin ZIP download logic can reason about each image's storage shape even if the tier later changes.

Admin ZIP download (`/api/admin/download/images`) fetches `imageUrl` directly: for free/basic events the URL returns the compressed derivative (fast, album-thumb-grade); for premium/unlimited events the URL returns the original (album-print-grade). No two-URL storage, no post-hoc transforms.

Messages are separate: upserted via `prisma.message.upsert({ where: { guestId } })` in the same POST. A message can be submitted without images and vice versa.

### Admin download endpoints
- `/api/admin/download/images` — streams ZIP. Only fetches URLs passing `isAllowedImageUrl()` (Cloudinary allowlist + base64 data URIs). Do not extend this without re-auditing.
- `/api/admin/download/messages` — HTML export with escaped content to prevent XSS.

## Key Directory Pointers

```
app/api/guest/    login, upload, images/count, images/delete, logout
app/api/admin/    login, register, logout, events, check-slug, guest/[id], download/images, download/messages
app/admin/        login, register, event (one-time creation), dashboard, dashboard/[eventId], dashboard/guest/[id]
app/guest/        login, dashboard, success
components/admin/ AdminDashboardTabs (6 tabs), GuestCard, AdminGalleryAllImages, AdminDownloadAll,
                  qr-template/ (QrTemplateSelector, templates.ts, CanvasRenderer, ColorPicker)
components/guest/ Upload-Form, ImageUpload, ImageGallery, DashboardClient, SessionPersistence,
                  UploadLimitReachedCelebration, ImageSlotBar, UploadStatusList, DeleteImageButton
lib/              admin-auth, guest-auth, csrf, prisma (singleton), cloudinary, pricing-tiers,
                  guestCache (in-memory), email (stub), i18n/, context/LanguageContext
locales/{sr,en}/translation.json
prisma/schema.prisma
scripts/          cleanupOrphanedEvents.js, sendImageReminder.js, migrate-existing-events.ts, clear-db.ts
```

## Prisma Models (summary)

- `Admin` ←1:1→ `Event` (unique `adminId` on Event)
- `AdminSession` (`sessionToken` unique, `expiresAt`, index on `adminId`)
- `Event` (`slug` unique, `imageLimit`, `pricingTier`)
- `Guest` (unique compound `(email, eventId)`; holds its own `sessionToken` + `sessionExpires`)
- `Image` (belongs to Guest; `storagePath` = Cloudinary `public_id`)
- `Message` 1:1 Guest (via `guestId`)
- `PricingPlan` + `PricingFeature` (tier metadata; hardcoded fallback in `/lib/pricing-tiers.ts`)

## Security posture

### RLS — svjesno isključen
Row-Level Security je **isključen na svim tabelama** (`pg_tables.rowsecurity = false`). Multi-tenant izolacija se enforce-uje **samo na app sloju** kroz `getAuthenticatedAdmin()` ([lib/admin-auth.ts](lib/admin-auth.ts)) i `getAuthenticatedGuest()` ([lib/guest-auth.ts](lib/guest-auth.ts)), uz obavezno filtriranje svakog upita po `admin.event.id` ili `guest.id`.

Razlog što RLS nije aktivan:
- Solo dev, svi pristupi kroz jednu Next.js aplikaciju
- Prisma ne podržava native RLS session context — zahtijeva custom middleware koji postavlja `SET LOCAL app.current_user_id` po svakom request-u
- Prisma Postgres (`db.prisma.io`) može ne dati role-create privilegije potrebne za policy-je
- Defense-in-depth se dobija kroz **FK constraints + CHECK constraints + CSRF + rate limiting + ownership filter na svakoj query-ju**

**Kad uključiti RLS:** ako se uvedu dodatne role (npr. "moderator", "viewer") ili ako se omogući direktan DB pristup partnerima/trećim licima.

### Defense layers (summary)
1. CSRF tokens na svim state-mijenjajućim rutama (`@edge-csrf/core`)
2. Per-IP rate limiting na login/register/upload/delete/feedback (in-memory, migrirati na Redis pri horizontal scale)
3. Session validation u DB (ne samo cookie presence u middleware-u)
4. Ownership filter na svim query-ima (`WHERE adminId = session.admin.id` ili `guestId = session.guest.id`)
5. FK constraints na DB nivou (RESTRICT/CASCADE po potrebi)
6. CHECK constraints na DB nivou (numerički rangovi, email regex, slug format, length limits)
7. Invariant API tests ([__tests__/api/admin-events-invariant.test.ts](__tests__/api/admin-events-invariant.test.ts))
8. Drift audit skripta ([scripts/audit-drift.ts](scripts/audit-drift.ts)) za CI/cron

## Gotchas

- **Two Next configs exist**: `next.config.mjs` (active) and `next.config.js` (legacy, ignores TS/ESLint errors during build). Edit `.mjs`.
- **PWA disabled** — `next-pwa@5.6.0` is incompatible with Next 15.3.9; migration to `@serwist/next` is a known TODO.
- **Images are unoptimized** in `next.config.mjs` (`images: { unoptimized: true }`) — don't assume `next/image` optimization is working.
- **Guest session token is opaque**, never the guest's DB id. Never accept a guest id from the client.
- **Slow query logging** (>100ms) is enabled in dev via the Prisma Optimize extension when `OPTIMIZE_API_KEY` is set.
- **Slug generation** on event create strips accents and auto-suggests; real-time availability check is debounced 500ms against `/api/admin/check-slug`.
- **No edit-event flow** — once an admin creates their event, the only current path is view/manage. Editing event metadata requires a new endpoint.
- **i18n rewrite is a rewrite, not a redirect** — the URL keeps the `/sr` or `/en` prefix; internal routing sees the un-prefixed path.
- **`guestCache`** is in-memory per server instance — not safe to rely on across serverless invocations on Vercel.

## Environment (keys only — see `.env.local`)

`DATABASE_URL`, `DIRECT_DATABASE_URL`, `CSRF_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `ADMIN_EMAIL`, `ADMIN_EMAIL_PASSWORD`, `OPTIMIZE_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (NextAuth/Google vars are present in env but no active code path uses them at the time of writing).
