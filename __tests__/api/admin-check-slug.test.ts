/** @jest-environment node */
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
  (globalThis as any).__checkSlugAttempts = new Map();
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

it('rate-limits after 10 requests in 60s', async () => {
  m.admin.mockResolvedValue({ id: 'a1' });
  m.findUnique.mockResolvedValue(null);
  for (let i = 0; i < 10; i++) await GET(req('x' + i) as any);
  const res = await GET(req('eleventh') as any);
  expect(res.status).toBe(429);
});
