import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';
import type { PricingTier } from '@/lib/pricing-tiers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_ORDER: PricingTier[] = ['free', 'basic', 'premium'];

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'invalid csrf' }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'no event' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const toTier = body?.toTier;
  if (toTier !== 'basic' && toTier !== 'premium') {
    return NextResponse.json({ error: 'toTier must be basic or premium' }, { status: 400 });
  }

  const fromTier = admin.event.pricingTier as PricingTier;
  if (fromTier === toTier) {
    return NextResponse.json({ error: `already on ${toTier}` }, { status: 400 });
  }
  if (TIER_ORDER.indexOf(toTier) <= TIER_ORDER.indexOf(fromTier)) {
    return NextResponse.json({ error: 'downgrades not supported' }, { status: 400 });
  }
  if (!admin.event.activatedAt) {
    return NextResponse.json({ error: 'finish initial payment first' }, { status: 409 });
  }

  const variantId = resolveVariantId({ purpose: 'upgrade', fromTier, toTier });
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com/').replace(/\/?$/, '/');
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      event_id: admin.event.id,
      admin_id: admin.id,
      purpose: 'upgrade',
      to_tier: toTier,
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?upgraded=1`,
  });

  return NextResponse.json({ checkoutUrl });
}
