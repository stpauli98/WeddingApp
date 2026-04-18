// Scheduled cleanup — invoked daily by Vercel Cron (see vercel.json).
// Requires `Authorization: Bearer ${CRON_SECRET}` header (Vercel injects this
// automatically for its own Cron; manual calls must pass it explicitly).
//
// Behaviour:
//  - Nulls expired guest session tokens (keeps the Guest row — it may own Images/Message).
//  - Deletes AdminSession rows that expired more than 1 day ago (no FK dependents).
//  - Deletes orphan Image rows (defensive — ON DELETE RESTRICT should prevent these).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const GUEST_SESSION_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after expiry
const ADMIN_SESSION_GRACE_MS = 1 * 24 * 60 * 60 * 1000; // 1 day after expiry

export async function GET(request: Request) {
  // Auth: Bearer token matching CRON_SECRET env var.
  const authHeader = request.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const guestCutoff = new Date(now.getTime() - GUEST_SESSION_GRACE_MS);
  const adminCutoff = new Date(now.getTime() - ADMIN_SESSION_GRACE_MS);

  try {
    // Null guest session tokens that expired > grace period ago.
    const guestSessionsCleared = await prisma.guest.updateMany({
      where: {
        sessionExpires: { lt: guestCutoff },
        sessionToken: { not: null },
      },
      data: { sessionToken: null, sessionExpires: null },
    });

    // Delete admin sessions expired > grace period ago.
    const adminSessionsDeleted = await prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: adminCutoff } },
    });

    return NextResponse.json({
      ok: true,
      at: now.toISOString(),
      guestSessionsCleared: guestSessionsCleared.count,
      adminSessionsDeleted: adminSessionsDeleted.count,
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
