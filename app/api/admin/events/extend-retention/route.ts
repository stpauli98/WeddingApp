// Admin-initiated retention extension for their event.
// Days is absolute (sets retentionOverrideDays, not additive) — simpler UX.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import {
  getEffectiveTier,
  maxRetentionOverrideDays,
  isGrandfathered,
} from '@/lib/entitlement';

const MIN_DAYS = 0;
const ABSOLUTE_MAX_DAYS = 365;

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrfToken = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrfToken))) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }

  const days = (body as { days?: unknown })?.days;
  if (
    !Number.isInteger(days) ||
    (days as number) < MIN_DAYS ||
    (days as number) > ABSOLUTE_MAX_DAYS
  ) {
    return NextResponse.json(
      { error: `"days" mora biti cijeli broj između ${MIN_DAYS} i ${ABSOLUTE_MAX_DAYS}.` },
      { status: 400 }
    );
  }

  // Per-tier cap enforcement — derived from Payment history, not Event.pricingTier
  const eventRow = await prisma.event.findUnique({
    where: { id: admin.event.id },
    select: { legacyGrandfathered: true },
  });
  if (!eventRow) {
    return NextResponse.json({ error: 'Event ne postoji.' }, { status: 404 });
  }
  const effectiveTier = await getEffectiveTier(admin.event.id);
  const cap = isGrandfathered(eventRow)
    ? ABSOLUTE_MAX_DAYS
    : maxRetentionOverrideDays(effectiveTier);
  if ((days as number) > cap) {
    return NextResponse.json(
      { error: `Ovaj tier dozvoljava najviše ${cap} dodatnih dana.` },
      { status: 403 }
    );
  }

  const updated = await prisma.event.update({
    where: { id: admin.event.id },
    data: {
      retentionOverrideDays: days as number,
      // Reset the warning flag — extended retention may push expiry past the
      // previous warning window, so the next window should re-warn.
      deletionWarningSentAt: null,
    },
    select: { retentionOverrideDays: true },
  });

  return NextResponse.json({ ok: true, retentionOverrideDays: updated.retentionOverrideDays });
}
