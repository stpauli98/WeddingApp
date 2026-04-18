/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: jest.fn(), create: jest.fn() },
    pricingPlan: { findUnique: jest.fn() },
    event: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/csrf', () => ({
  generateCsrfToken: jest.fn().mockResolvedValue({ token: 't', cookie: 'c' }),
  validateCsrfToken: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));
jest.mock('@/lib/lemon-squeezy', () => ({
  createCheckoutUrl: jest.fn(),
}));

import { POST } from '@/app/api/payments/checkout/route';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { createCheckoutUrl } from '@/lib/lemon-squeezy';

const getAdmin = getAuthenticatedAdmin as jest.MockedFunction<any>;
const validateCsrf = validateCsrfToken as jest.MockedFunction<any>;
const findManyPayments = prisma.payment.findMany as jest.MockedFunction<any>;
const createPayment = prisma.payment.create as jest.MockedFunction<any>;
const findUniquePlan = prisma.pricingPlan.findUnique as jest.MockedFunction<any>;
const findUniqueEvent = prisma.event.findUnique as jest.MockedFunction<any>;
const createLS = createCheckoutUrl as jest.MockedFunction<any>;

function req(body: unknown, csrf = 't'): Request {
  return new Request('http://localhost/api/payments/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).__paymentCheckoutAttempts?.clear();
  validateCsrf.mockResolvedValue(true);
  getAdmin.mockResolvedValue({
    id: 'a1',
    email: 'admin@x.com',
    event: { id: 'e1', pricingTier: 'free' },
  });
  findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'free' });
  findUniquePlan.mockResolvedValue({ price: 3999, lsVariantId: 'v_premium' });
  findManyPayments.mockResolvedValue([]);
  createPayment.mockResolvedValue({ id: 'p1', lsCheckoutId: 'ck1' });
  createLS.mockResolvedValue('https://ls.test/checkout/xyz');
});

describe('POST /api/payments/checkout', () => {
  it('rejects missing CSRF', async () => {
    validateCsrf.mockResolvedValue(false);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated admin', async () => {
    getAdmin.mockResolvedValue(null);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid targetTier', async () => {
    const res = await POST(req({ targetTier: 'hackerTier' }));
    expect(res.status).toBe(400);
  });

  it('rejects downgrade (current=premium, target=basic)', async () => {
    getAdmin.mockResolvedValue({
      id: 'a1',
      email: 'a@x',
      event: { id: 'e1', pricingTier: 'premium' },
    });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'premium' });
    const res = await POST(req({ targetTier: 'basic' }));
    expect(res.status).toBe(409);
  });

  it('rejects same-tier', async () => {
    getAdmin.mockResolvedValue({
      id: 'a1',
      email: 'a@x',
      event: { id: 'e1', pricingTier: 'basic' },
    });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'basic' });
    findUniquePlan.mockResolvedValue({ price: 1999, lsVariantId: 'v_basic' });
    findManyPayments.mockResolvedValue([
      { amountCents: 1999, refundedAmountCents: 0 },
    ]);
    const res = await POST(req({ targetTier: 'basic' }));
    expect(res.status).toBe(409);
  });

  it('computes full price for free → premium', async () => {
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 3999,
          tier: 'premium',
          status: 'pending',
        }),
      })
    );
    const body = await res.json();
    expect(body.url).toBe('https://ls.test/checkout/xyz');
  });

  it('computes differential for basic → premium (already paid 1999)', async () => {
    getAdmin.mockResolvedValue({
      id: 'a1',
      email: 'a@x',
      event: { id: 'e1', pricingTier: 'basic' },
    });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'basic' });
    findManyPayments.mockResolvedValue([
      { amountCents: 1999, refundedAmountCents: 0 },
    ]);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 2000 }),
      })
    );
  });

  it('rate limits at 11th attempt per IP', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await POST(req({ targetTier: 'premium' }));
      expect(r.status).toBe(200);
    }
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(429);
  });

  it('ignores client-supplied amountCents (security)', async () => {
    await POST(req({ targetTier: 'premium', amountCents: 1 }));
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 3999 }),
      })
    );
  });

  it('returns 503 when plan has no lsVariantId', async () => {
    findUniquePlan.mockResolvedValue({ price: 3999, lsVariantId: null });
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(503);
  });
});
