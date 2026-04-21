/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: { guest: { findUnique: jest.fn() } },
}));
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));

import { GET } from '@/app/api/admin/guest/[id]/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const m = {
  findUnique: prisma.guest.findUnique as jest.MockedFunction<any>,
  admin: getAuthenticatedAdmin as jest.MockedFunction<any>,
};

it('does not leak adminId or retentionOverrideDays in event payload', async () => {
  m.admin.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  m.findUnique.mockResolvedValue({
    id: 'g1',
    eventId: 'e1',
    images: [],
    message: null,
    event: { id: 'e1', slug: 'ana-marko', coupleName: 'Ana i Marko', date: new Date() },
  });
  const res = await GET(
    new Request('http://x') as any,
    { params: Promise.resolve({ id: 'g1' }) }
  );
  const body = await res.json();
  expect(body.event).toBeDefined();
  expect(body.event.adminId).toBeUndefined();
  expect(body.event.retentionOverrideDays).toBeUndefined();
  expect(body.event.slug).toBe('ana-marko');

  // Verify Prisma was called with select (not include: true)
  const call = m.findUnique.mock.calls[0][0];
  expect(call.include.event).toEqual({
    select: { id: true, slug: true, coupleName: true, date: true },
  });
});
