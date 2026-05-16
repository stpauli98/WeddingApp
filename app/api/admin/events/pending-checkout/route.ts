import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    return NextResponse.json({ error: 'no event' }, { status: 404 });
  }
  if (admin.event.activatedAt) {
    return NextResponse.json({ error: 'event already active' }, { status: 409 });
  }
  if (admin.event.pricingTier === 'free') {
    return NextResponse.json({ error: 'free tier needs no checkout' }, { status: 400 });
  }
  if (admin.event.pricingTier !== 'basic' && admin.event.pricingTier !== 'premium') {
    return NextResponse.json({ error: 'unsupported tier' }, { status: 400 });
  }

  const variantId = resolveVariantId({
    purpose: 'initial_purchase',
    tier: admin.event.pricingTier as Exclude<typeof admin.event.pricingTier, 'free' | 'unlimited'>,
  });

  const baseUrl = (process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com/').replace(/\/?$/, '/');
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      eventId: admin.event.id,
      adminId: admin.id,
      purpose: 'initial_purchase',
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?paid=1`,
  });

  return NextResponse.json({ checkoutUrl });
}
