/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { deleteMany: jest.fn() },
    event: { deleteMany: jest.fn() },
    $transaction: jest.fn(async (ops) => Promise.all(ops)),
  },
}));
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));

import { POST } from '@/app/api/admin/events/cancel-pending/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

function req() {
  return new Request('https://x/api/admin/events/cancel-pending', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: '{}',
  });
}

describe('POST /api/admin/events/cancel-pending — race-safe deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses deleteMany({where: id + activatedAt: null}) so concurrent webhook activation blocks the delete', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    (prisma.event.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.payment.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await POST(req());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/aktivan|active/i);
    expect(prisma.event.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'e1', activatedAt: null }),
    }));
  });

  it('succeeds when event is still pending at delete time', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    (prisma.event.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (prisma.payment.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await POST(req());
    expect(res.status).toBe(200);
  });

  it('rejects 409 if admin.event.activatedAt is non-null at guard time', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic' },
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(prisma.event.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects 401 unauthenticated', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req());
    expect([401, 404]).toContain(res.status);
  });
});
