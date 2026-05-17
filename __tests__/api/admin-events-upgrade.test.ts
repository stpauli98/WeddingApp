/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: { payment: { create: jest.fn() } },
}));
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));
jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://lc.test/checkout/up'),
}));

import { POST } from '@/app/api/admin/events/upgrade/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

function req(body: any) {
  return new Request('https://x/api/admin/events/upgrade', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/events/upgrade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LS_VARIANT_BASIC = 'vb';
    process.env.LS_VARIANT_PREMIUM = 'vp';
    process.env.LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM = 'vu';
  });

  it('rejects 401 unauthenticated', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(401);
  });

  it('rejects 401 admin without event', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({ id: 'a1', email: 'a@b.c', event: null });
    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(401);
  });

  it('rejects 400 invalid toTier', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free' },
    });
    const res = await POST(req({ toTier: 'free' }));
    expect(res.status).toBe(400);
  });

  it('rejects 400 same tier (no-op)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic' },
    });
    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(400);
  });

  it('rejects 400 downgrade premium → basic', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'premium' },
    });
    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(400);
  });

  it('rejects 409 unactivated event (must finish initial purchase)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    const res = await POST(req({ toTier: 'premium' }));
    expect(res.status).toBe(409);
  });

  it('happy path free → basic returns checkoutUrl + persists pending Payment', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free' },
    });
    (prisma.payment.create as jest.Mock).mockResolvedValueOnce({ id: 'p1' });

    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://lc.test/checkout/up');
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: 'e1', purpose: 'upgrade', status: 'pending', tier: 'basic',
        metadata: expect.objectContaining({ fromTier: 'free', toTier: 'basic' }),
      }),
    }));
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: 'a@b.c',
      customData: expect.objectContaining({
        event_id: 'e1', admin_id: 'a1', purpose: 'upgrade', to_tier: 'basic',
      }),
    }));
  });

  it('happy path basic → premium uses upgrade variant', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic' },
    });
    (prisma.payment.create as jest.Mock).mockResolvedValueOnce({ id: 'p2' });

    const res = await POST(req({ toTier: 'premium' }));
    expect(res.status).toBe(200);
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customData: expect.objectContaining({ to_tier: 'premium' }),
    }));
  });
});
