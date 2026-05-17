/** @jest-environment node */
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ prisma: { payment: { create: jest.fn() } } }));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));
jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://lc.test/checkout/ret'),
}));

import { POST } from '@/app/api/admin/events/extend-retention/route';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

function req() {
  return new Request('https://x/api/admin/events/extend-retention', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: '{}',
  });
}

describe('POST /api/admin/events/extend-retention (paywall)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LS_VARIANT_RETENTION_30 = 'vr';
  });

  it('returns checkoutUrl for activated basic tier admin', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic', retentionOverrideDays: 30 },
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://lc.test/checkout/ret');
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        purpose: 'retention_extension', status: 'pending', tier: 'basic', retentionDaysGranted: 30,
      }),
    }));
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customData: expect.objectContaining({
        event_id: 'e1', admin_id: 'a1', purpose: 'retention_extension',
      }),
    }));
  });

  it('rejects 401 unauthenticated', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it('rejects 403 free tier', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free', retentionOverrideDays: 0 },
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
  });

  it('rejects 409 when retention cap would be exceeded (current + 30 > 365)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'premium', retentionOverrideDays: 340 },
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
  });

  it('rejects 409 when event not activated', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic', retentionOverrideDays: 0 },
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
  });

  it('rejects 403 invalid CSRF', async () => {
    const { validateCsrfToken } = await import('@/lib/csrf');
    (validateCsrfToken as jest.Mock).mockResolvedValueOnce(false);
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic', retentionOverrideDays: 0 },
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
  });
});
