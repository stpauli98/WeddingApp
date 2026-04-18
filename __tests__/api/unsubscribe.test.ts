/**
 * @jest-environment node
 *
 * GDPR unsubscribe: public, token-based, no auth.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    marketingContact: { updateMany: jest.fn() },
  },
}));

import { GET } from '@/app/api/unsubscribe/route';
import { prisma } from '@/lib/prisma';

const updateMany = prisma.marketingContact.updateMany as jest.MockedFunction<any>;

const VALID_TOKEN = 'a'.repeat(48);

beforeEach(() => {
  jest.clearAllMocks();
});

function req(url: string): Request {
  return new Request(url, { method: 'GET' });
}

describe('GET /api/unsubscribe', () => {
  it('rejects missing token with 400', async () => {
    const res = await GET(req('http://localhost/api/unsubscribe'));
    expect(res.status).toBe(400);
  });

  it('rejects short token with 400', async () => {
    const res = await GET(req('http://localhost/api/unsubscribe?token=abc'));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects non-hex token with 400', async () => {
    const res = await GET(req(`http://localhost/api/unsubscribe?token=${'z'.repeat(48)}`));
    expect(res.status).toBe(400);
  });

  it('sets unsubscribedAt when token matches and not already unsubscribed', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    const res = await GET(req(`http://localhost/api/unsubscribe?token=${VALID_TOKEN}`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { unsubscribeToken: VALID_TOKEN, unsubscribedAt: null },
      data: { unsubscribedAt: expect.any(Date) },
    });
  });

  it('returns ok:false if token not found or already unsubscribed', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const res = await GET(req(`http://localhost/api/unsubscribe?token=${VALID_TOKEN}`));
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
