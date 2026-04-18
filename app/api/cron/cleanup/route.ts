// Scheduled cleanup — invoked daily by Vercel Cron (see vercel.json).
// Requires `Authorization: Bearer ${CRON_SECRET}` header.
//
// Three passes, in order:
//   1. Null expired guest session tokens (keeps Guest row — may own Images/Message).
//   2. Delete AdminSession rows expired > 1 day.
//   3. Retention warnings + hard deletes for events past their tier's storageDays.

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import { sendDeletionWarningEmail } from '@/lib/email';
import cloudinary from '@/lib/cloudinary';

const GUEST_SESSION_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after expiry
const ADMIN_SESSION_GRACE_MS = 1 * 24 * 60 * 60 * 1000; // 1 day after expiry
const WARNING_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // warn 2 days before expiry

// Per-IP rate limit — defence-in-depth if CRON_SECRET ever leaks.
// Vercel Cron retries + occasional manual curl comfortably fit under 6/h.
declare global {
  var __cronCleanupAttempts: Map<string, number[]> | undefined;
}
const cronAttempts: Map<string, number[]> = globalThis.__cronCleanupAttempts || new Map();
globalThis.__cronCleanupAttempts = cronAttempts;
const CRON_MAX = 6;
const CRON_WINDOW_MS = 60 * 60 * 1000;

function computeExpiry(eventDate: Date, tier: string): Date {
  const cfg = PRICING_TIERS[tier as PricingTier] ?? PRICING_TIERS.free;
  return new Date(eventDate.getTime() + cfg.storageDays * 24 * 60 * 60 * 1000);
}

function dashboardUrl(eventId: string, lang: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dodajuspomenu.com';
  const prefix = lang === 'en' ? '/en' : '/sr';
  return `${base}${prefix}/admin/dashboard/${eventId}`;
}

function safeCompareBearer(header: string, secret: string): boolean {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!safeCompareBearer(authHeader, process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by IP — protects against a leaked secret being used to spam.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const nowMs = Date.now();
  const recent = (cronAttempts.get(ip) || []).filter((ts) => nowMs - ts < CRON_WINDOW_MS);
  if (recent.length >= CRON_MAX) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }
  cronAttempts.set(ip, [...recent, nowMs]);

  const now = new Date();
  const result = {
    ok: true,
    at: now.toISOString(),
    guestSessionsCleared: 0,
    adminSessionsDeleted: 0,
    warningEmailsSent: 0,
    eventsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // 1. Guest session token cleanup (grace 7 days).
    const guestCutoff = new Date(now.getTime() - GUEST_SESSION_GRACE_MS);
    result.guestSessionsCleared = (
      await prisma.guest.updateMany({
        where: {
          sessionExpires: { lt: guestCutoff },
          sessionToken: { not: null },
        },
        data: { sessionToken: null, sessionExpires: null },
      })
    ).count;

    // 2. AdminSession hard delete (grace 1 day).
    const adminCutoff = new Date(now.getTime() - ADMIN_SESSION_GRACE_MS);
    result.adminSessionsDeleted = (
      await prisma.adminSession.deleteMany({
        where: { expiresAt: { lt: adminCutoff } },
      })
    ).count;

    // 3. Retention: fetch candidate events (not yet deleted).
    const candidates = await prisma.event.findMany({
      where: { deletedAt: null },
      include: {
        admin: {
          select: {
            email: true,
            language: true,
            createdAt: true,
            marketingConsent: true,
          },
        },
        guests: {
          select: {
            id: true,
            email: true,
            marketingConsent: true,
            createdAt: true,
            images: { select: { id: true, storagePath: true } },
            message: { select: { id: true } },
          },
        },
      },
    });

    for (const e of candidates) {
      const expiresAt = computeExpiry(e.date, e.pricingTier);

      // 3a. Hard delete: expiry reached.
      if (now >= expiresAt) {
        try {
          await executeHardDelete(e);
          result.eventsDeleted += 1;
        } catch (err: any) {
          result.errors.push(`delete ${e.slug}: ${err?.message || 'unknown'}`);
        }
        continue;
      }

      // 3b. Warning: 2-day window, not yet sent.
      if (
        e.deletionWarningSentAt === null &&
        expiresAt.getTime() - now.getTime() <= WARNING_WINDOW_MS &&
        e.admin?.email
      ) {
        try {
          const imageCount = (e.guests as Array<{ images: unknown[] }>).reduce(
            (n, g) => n + g.images.length,
            0
          );
          const messageCount = (e.guests as Array<{ message: unknown }>).filter(
            (g) => g.message
          ).length;
          await sendDeletionWarningEmail({
            to: e.admin.email,
            language: (e.admin.language === 'en' ? 'en' : 'sr') as 'sr' | 'en',
            coupleName: e.coupleName,
            eventSlug: e.slug,
            expiresAt,
            imageCount,
            guestCount: e.guests.length,
            messageCount,
            dashboardUrl: dashboardUrl(e.id, e.admin.language || 'sr'),
          });
          await prisma.event.update({
            where: { id: e.id },
            data: { deletionWarningSentAt: new Date() },
          });
          result.warningEmailsSent += 1;
        } catch (err: any) {
          result.errors.push(`warn ${e.slug}: ${err?.message || 'unknown'}`);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cleanup cron fatal error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

async function executeHardDelete(event: {
  id: string;
  slug: string;
  coupleName: string;
  date: Date;
  admin:
    | { email: string; createdAt: Date; marketingConsent: boolean }
    | null;
  guests: {
    id: string;
    email: string;
    marketingConsent: boolean;
    createdAt: Date;
    images: { id: string; storagePath: string | null }[];
  }[];
}): Promise<void> {
  // a) Harvest CONSENTED emails + DB cleanup in ONE atomic transaction.
  // Ordering rationale: Cloudinary is the slower/external side and its
  // orphans are cheaper than broken Image.imageUrl rows. We run the DB
  // txn first, commit, THEN best-effort Cloudinary deletion.
  const guestIds = event.guests.map((g) => g.id);
  const storagePaths = event.guests
    .flatMap((g) => g.images.map((i) => i.storagePath))
    .filter((p): p is string => !!p);

  const ops = [];

  for (const g of event.guests) {
    if (!g.marketingConsent) continue;
    ops.push(
      prisma.marketingContact.upsert({
        where: { email_source: { email: g.email, source: 'guest' } },
        create: {
          email: g.email,
          source: 'guest',
          eventSlug: event.slug,
          coupleName: event.coupleName,
          weddingDate: event.date,
          consentedAt: g.createdAt,
        },
        update: {},
      })
    );
  }

  // Admin harvest — only when admin has explicitly opted in.
  // Prior design harvested all admins; GDPR requires explicit opt-in.
  if (event.admin?.email && event.admin.marketingConsent) {
    ops.push(
      prisma.marketingContact.upsert({
        where: { email_source: { email: event.admin.email, source: 'admin' } },
        create: {
          email: event.admin.email,
          source: 'admin',
          consentedAt: event.admin.createdAt,
        },
        update: {},
      })
    );
  }

  ops.push(
    prisma.image.deleteMany({ where: { guestId: { in: guestIds } } }),
    prisma.message.deleteMany({ where: { guestId: { in: guestIds } } }),
    prisma.guest.deleteMany({ where: { eventId: event.id } }),
    prisma.event.update({
      where: { id: event.id },
      data: { deletedAt: new Date(), guestMessage: null },
    })
  );

  await prisma.$transaction(ops);

  // b) Best-effort Cloudinary cleanup AFTER DB commit.
  // If this fails, assets become orphaned in Cloudinary (log + reap manually).
  // Never blocks retention semantics — DB is the source of truth for user-visible state.
  if (storagePaths.length) {
    await deleteCloudinaryInChunks(storagePaths, event.slug);
  }
}

// Cloudinary caps delete_resources at 100 public_ids per call.
// Chunk + catch-per-batch so one failed batch doesn't abort the rest.
async function deleteCloudinaryInChunks(publicIds: string[], contextLabel: string): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < publicIds.length; i += CHUNK) {
    const batch = publicIds.slice(i, i + CHUNK);
    try {
      await cloudinary.api.delete_resources(batch);
    } catch (err) {
      console.error(
        `Cloudinary batch ${i}..${i + batch.length} failed for ${contextLabel}:`,
        err
      );
    }
  }
}
