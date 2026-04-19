import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { createCheckoutUrl } from '@/lib/lemon-squeezy';
import { TIER_ORDER } from '@/lib/entitlement';
import { randomBytes } from 'crypto';
import type { PricingTier } from '@prisma/client';

export const runtime = 'nodejs';

declare global {
  var __paymentCheckoutAttempts: Map<string, number[]> | undefined;
}
const attempts: Map<string, number[]> =
  globalThis.__paymentCheckoutAttempts || new Map();
globalThis.__paymentCheckoutAttempts = attempts;
const CHECKOUT_MAX = 10;
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;

const VALID_TIERS: PricingTier[] = ['free', 'basic', 'premium', 'unlimited'];

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || ''))) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((ts) => now - ts < CHECKOUT_WINDOW_MS);
  if (recent.length >= CHECKOUT_MAX) {
    return NextResponse.json(
      { error: 'Previše pokušaja, pokušajte kasnije.' },
      { status: 429 }
    );
  }
  attempts.set(ip, [...recent, now]);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }
  const targetTier = (body as { targetTier?: unknown })?.targetTier;
  if (
    typeof targetTier !== 'string' ||
    !VALID_TIERS.includes(targetTier as PricingTier)
  ) {
    return NextResponse.json({ error: 'Nevažeći tier.' }, { status: 400 });
  }
  const target = targetTier as PricingTier;

  const event = await prisma.event.findUnique({
    where: { id: admin.event.id },
    select: { id: true, pricingTier: true },
  });
  if (!event) {
    return NextResponse.json({ error: 'Event ne postoji.' }, { status: 404 });
  }

  if (TIER_ORDER[target] <= TIER_ORDER[event.pricingTier as PricingTier]) {
    return NextResponse.json(
      { error: 'Downgrade ili isti tier nije moguć.' },
      { status: 409 }
    );
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { tier: target },
    select: { price: true, lsVariantId: true },
  });
  if (!plan?.lsVariantId) {
    return NextResponse.json(
      { error: 'Plan nije dostupan za kupovinu.' },
      { status: 503 }
    );
  }

  const existingPayments = await prisma.payment.findMany({
    where: { eventId: event.id, status: { in: ['paid', 'partial'] } },
    select: { amountCents: true, refundedAmountCents: true },
  });
  const netPaid: number = (existingPayments as Array<{ amountCents: number; refundedAmountCents: number }>).reduce(
    (sum: number, p) => sum + (p.amountCents - p.refundedAmountCents),
    0
  );
  const amountDue = plan.price - netPaid;
  if (amountDue <= 0) {
    return NextResponse.json(
      { error: 'Već si platio ovaj ili veći tier.' },
      { status: 409 }
    );
  }

  const checkoutInternalId = randomBytes(16).toString('hex');

  await prisma.payment.create({
    data: {
      eventId: event.id,
      tier: target,
      amountCents: amountDue,
      status: 'pending',
      lsCheckoutId: checkoutInternalId,
      customerEmail: admin.email,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dodajuspomenu.com';
  const url = await createCheckoutUrl({
    variantId: plan.lsVariantId,
    customPriceCents: amountDue,
    customData: {
      eventId: event.id,
      adminId: admin.id,
      targetTier: target,
      checkoutInternalId,
    },
    redirectUrl: `${baseUrl}/sr/admin/dashboard/${event.id}?payment=success&ck=${checkoutInternalId}`,
    customerEmail: admin.email,
  });

  return NextResponse.json({ url });
}
