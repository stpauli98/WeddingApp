# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical security vulnerabilities in WeddingApp API routes — unauthenticated endpoints and missing authorization.

**Architecture:** Extract admin session validation into a reusable helper function. Apply it to all unprotected admin API routes. Scope data queries to admin's own event only.

**Tech Stack:** Next.js API routes, Prisma, cookies()

---

## Helper: Admin Auth Validator

Before fixing individual routes, create a shared helper to avoid duplicating session validation.

**File:** `lib/admin-auth.ts`

```typescript
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Validates admin session and returns admin + event data.
 * Returns null if session is invalid or expired.
 */
export async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  if (!sessionToken) return null;

  const session = await prisma.adminSession.findUnique({
    where: { sessionToken },
    include: {
      admin: {
        include: {
          event: { select: { id: true, slug: true } }
        }
      }
    }
  });

  if (!session || !session.admin) return null;
  if (session.expiresAt < new Date()) return null;

  return session.admin;
}
```

---

## Chunk 1: Fix Unauthenticated Download & Guest API Routes

### Task 1: Create admin auth helper

**Files:**
- Create: `lib/admin-auth.ts`

- [ ] **Step 1: Create the helper file** with the code above
- [ ] **Step 2: Verify TypeScript compiles** — `npx tsc --noEmit`
- [ ] **Step 3: Commit** — `git commit -m "feat: add reusable admin session validation helper"`

---

### Task 2: Fix download images route

**Files:**
- Modify: `app/api/admin/download/images/route.ts`

**Problems:**
1. No authentication
2. Downloads ALL images from ALL events (not scoped to admin's event)
3. Only handles base64 data: URLs (ignores Cloudinary URLs)

- [ ] **Step 1: Add auth + scope to admin's event**

Replace entire GET handler with:
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  try {
    const images = await prisma.image.findMany({
      where: { guest: { eventId: admin.event.id } },
      select: { id: true, imageUrl: true },
    });

    if (!images.length) {
      return new NextResponse("Nema slika za preuzimanje", { status: 404 });
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const img of images) {
      if (img.imageUrl.startsWith("data:")) {
        const base64 = img.imageUrl.split(",")[1];
        zip.file(`slika_${img.id}.jpg`, base64, { base64: true });
      } else {
        // Cloudinary URL — fetch and add to zip
        try {
          const res = await fetch(img.imageUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const ext = img.imageUrl.includes(".png") ? "png" : "jpg";
            zip.file(`slika_${img.id}.${ext}`, buffer);
          }
        } catch {}
      }
    }

    const content = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(content as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=slike.zip`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Greška pri generisanju ZIP-a" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles** — `npx tsc --noEmit`
- [ ] **Step 3: Test manually** — access `/api/admin/download/images` without login → should get 401
- [ ] **Step 4: Commit** — `git commit -m "fix: add auth and event scoping to image download route"`

---

### Task 3: Fix download messages route

**Files:**
- Modify: `app/api/admin/download/messages/route.ts`

**Problems:** Same as images — no auth, no event scoping.

- [ ] **Step 1: Add auth + event scoping**

Add at top of GET handler (after imports):
```typescript
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
```

Replace `prisma.message.findMany(...)` query with:
```typescript
const admin = await getAuthenticatedAdmin();
if (!admin || !admin.event) {
  return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
}

const messages = await prisma.message.findMany({
  where: { guest: { eventId: admin.event.id } },
  select: { id: true, text: true, createdAt: true, guest: { select: { firstName: true, lastName: true } } },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Test manually** — access without login → 401
- [ ] **Step 4: Commit** — `git commit -m "fix: add auth and event scoping to messages download route"`

---

### Task 4: Fix admin guest detail route

**Files:**
- Modify: `app/api/admin/guest/[id]/route.ts`

**Problems:** No auth, returns guest from ANY event.

- [ ] **Step 1: Add auth + ownership check**

Replace entire file:
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { images: true, message: true, event: true },
  });

  if (!guest) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Verify guest belongs to admin's event
  if (guest.eventId !== admin.event.id) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 403 });
  }

  return NextResponse.json(guest);
}
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Commit** — `git commit -m "fix: add auth and ownership check to admin guest detail route"`

---

### Task 5: Verification

- [ ] **Step 1: Full build test** — `pnpm build`
- [ ] **Step 2: Push to origin** — `git push origin main`

---

## Upcoming Chunks (planned but not yet detailed)

- **Chunk 2:** Fix guest session security (#1, #2) — replace UUID cookie with opaque session token
- **Chunk 3:** Fix upload/delete authorization (#3) — validate guestId from session, not URL
- **Chunk 4:** Add rate limiting (#6, #9) — protect login endpoints
- **Chunk 5:** Fix race conditions (#6, #7) — transactions for upload, Cloudinary cleanup
- **Chunk 6:** EXIF stripping + CSRF improvements (#8, #11, #12)
