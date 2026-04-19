/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { payment: { findMany: jest.fn() } },
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));

import { GET } from '@/app/api/payments/history/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const getAdmin = getAuthenticatedAdmin as jest.MockedFunction<any>;
const findMany = prisma.payment.findMany as jest.MockedFunction<any>;

beforeEach(() => {
  jest.clearAllMocks();
  getAdmin.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  findMany.mockResolvedValue([
    {
      id: 'p1',
      tier: 'premium',
      amountCents: 3999,
      refundedAmountCents: 0,
      status: 'paid',
      createdAt: new Date(),
    },
  ]);
});

describe('GET /api/payments/history', () => {
  it('returns 401 without session', async () => {
    getAdmin.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/payments/history'));
    expect(res.status).toBe(401);
  });

  it('returns only own event payments (IDOR guard — ignores body eventId)', async () => {
    const res = await GET(
      new Request('http://localhost/api/payments/history?eventId=someoneElse')
    );
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: 'e1' }),
      })
    );
  });

  it('returns serialized payments', async () => {
    const res = await GET(new Request('http://localhost/api/payments/history'));
    const body = await res.json();
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({ tier: 'premium', amountCents: 3999 });
  });
});
