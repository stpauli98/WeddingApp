// Admin-initiated retention extension — paywalled via LemonSqueezy.
// Each POST starts a €15 / +30 days purchase. Webhook handler bumps retentionOverrideDays.
import { NextResponse } from 'next/server';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RETENTION_DAYS_PER_PURCHASE = 30;
const RETENTION_MAX_OVERRIDE_DAYS = 365;

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }
  if (admin.event.pricingTier === 'free') {
    return NextResponse.json(
      { error: 'Free tier mora prvo nadograditi paket.' },
      { status: 403 }
    );
  }
  if (
    (admin.event.retentionOverrideDays ?? 0) + RETENTION_DAYS_PER_PURCHASE >
    RETENTION_MAX_OVERRIDE_DAYS
  ) {
    return NextResponse.json(
      { error: `Maksimalna retencija je ${RETENTION_MAX_OVERRIDE_DAYS} dana.` },
      { status: 409 }
    );
  }
  if (!admin.event.activatedAt) {
    return NextResponse.json({ error: 'Plaćanje na čekanju — završi inicijalnu kupovinu.' }, { status: 409 });
  }

  const variantId = resolveVariantId({ purpose: 'retention_extension' });
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com/').replace(/\/?$/, '/');
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      event_id: admin.event.id,
      admin_id: admin.id,
      purpose: 'retention_extension',
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?retention=1`,
  });

  return NextResponse.json({ checkoutUrl });
}
