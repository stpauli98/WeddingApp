/** @jest-environment node */
var mockRlCheck = jest.fn();
jest.mock('@/lib/security/rate-limit', () => ({
  __esModule: true,
  createRateLimiter: jest.fn(() => ({ check: (...args: any[]) => mockRlCheck(...args) })),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: { event: { findUnique: jest.fn() } },
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));

import { GET } from '@/app/api/admin/check-slug/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const m = {
  findUnique: prisma.event.findUnique as jest.MockedFunction<any>,
  admin: getAuthenticatedAdmin as jest.MockedFunction<any>,
};

function req(slug: string, ip = '1.2.3.4'): Request {
  return new Request(`http://x/api/admin/check-slug?slug=${slug}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRlCheck.mockClear();
  mockRlCheck.mockResolvedValue({ success: true, remaining: 9 });
});

it('returns 401 when no admin session', async () => {
  m.admin.mockResolvedValue(null);
  const res = await GET(req('ana-marko') as any);
  expect(res.status).toBe(401);
});

it('returns available=true when slug free', async () => {
  m.admin.mockResolvedValue({ id: 'a1' });
  m.findUnique.mockResolvedValue(null);
  const res = await GET(req('ana-marko') as any);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.available).toBe(true);
});

it('returns 429 when rate-limit exceeded', async () => {
  m.admin.mockResolvedValue({ id: 'a1' });
  mockRlCheck.mockResolvedValueOnce({ success: false, remaining: 0 });
  const res = await GET(req('anything') as any);
  expect(res.status).toBe(429);
});

it('returns available=false reason=reserved for reserved slug', async () => {
  m.admin.mockResolvedValue({ id: 'a1' });
  const res = await GET(req('admin') as any);
  const body = await res.json();
  expect(body.available).toBe(false);
  expect(body.reason).toBe('reserved');
  expect(m.findUnique).not.toHaveBeenCalled();
});
