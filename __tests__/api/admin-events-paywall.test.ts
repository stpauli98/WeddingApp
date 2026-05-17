/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    adminSession: { findUnique: jest.fn() },
    admin: { findUnique: jest.fn() },
    event: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    pricingPlan: { findUnique: jest.fn() },
    payment: { create: jest.fn() },
  },
}));

jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://checkout.lemonsqueezy.com/abc'),
}));

jest.mock('@/lib/lemonsqueezy/variants', () => ({
  resolveVariantId: jest.fn(() => 'var_test'),
}));

jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (name: string) =>
      name === 'admin_session' ? { value: 'sess1' } : undefined,
  }),
}));

import { POST } from '@/app/api/admin/events/route';
import { prisma } from '@/lib/prisma';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

function makeReq(body: any) {
  return new Request('https://x/api/admin/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't', cookie: 'admin_session=sess1' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/events paywall behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.adminSession.findUnique as jest.Mock).mockResolvedValue({
      admin: { id: 'a1', email: 'a@b.c' }, expiresAt: new Date(Date.now() + 100000),
    });
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ language: 'sr' });
  });

  it('creates free event with activatedAt set and no checkoutUrl', async () => {
    (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({ imageLimit: 3 });
    (prisma.event.create as jest.Mock).mockResolvedValueOnce({ id: 'e_free', slug: 'free-slug' });

    const res = await POST(makeReq({
      coupleName: 'Marko i Ana', location: 'Bg', date: '2027-01-01',
      slug: 'free-slug', pricingTier: 'free',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBeUndefined();
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pricingTier: 'free',
        activatedAt: expect.any(Date),
        pendingPaymentExpiresAt: null,
      }),
    }));
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(createCheckoutUrl).not.toHaveBeenCalled();
  });

  it('creates paid event pending + returns checkoutUrl (no pending Payment row)', async () => {
    (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({ imageLimit: 7 });
    (prisma.event.create as jest.Mock).mockResolvedValueOnce({ id: 'e_paid', slug: 'paid-slug' });

    const res = await POST(makeReq({
      coupleName: 'X Y', location: 'Bg', date: '2027-01-01',
      slug: 'paid-slug', pricingTier: 'basic',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://checkout.lemonsqueezy.com/abc');
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pricingTier: 'basic',
        activatedAt: null,
        pendingPaymentExpiresAt: expect.any(Date),
      }),
    }));
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: 'a@b.c',
      customData: expect.objectContaining({
        event_id: 'e_paid',
        admin_id: 'a1',
        purpose: 'initial_purchase',
      }),
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    }));
  });

  it('rejects unauthenticated request', async () => {
    (prisma.adminSession.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({
      coupleName: 'X Y', location: 'Bg', date: '2027-01-01',
      slug: 'x-slug', pricingTier: 'free',
    }));
    expect([401, 403]).toContain(res.status);
  });
});
