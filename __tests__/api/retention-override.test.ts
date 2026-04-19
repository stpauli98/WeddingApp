/**
 * @jest-environment node
 *
 * Admin-driven retention override: POST /api/admin/events/extend-retention
 *  - CSRF + session required
 *  - 0..365 day range
 *  - Writes retentionOverrideDays and clears deletionWarningSentAt
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: { update: jest.fn(), findUnique: jest.fn() },
    payment: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/csrf', () => ({
  generateCsrfToken: jest.fn().mockResolvedValue({ token: 't', cookie: 'c' }),
  validateCsrfToken: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));

import { POST } from '@/app/api/admin/events/extend-retention/route';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const updateEvent = prisma.event.update as jest.MockedFunction<any>;
const validateCsrf = validateCsrfToken as jest.MockedFunction<any>;
const getAdmin = getAuthenticatedAdmin as jest.MockedFunction<any>;

function req(body: unknown, csrf = 't'): Request {
  return new Request('http://localhost/api/admin/events/extend-retention', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  validateCsrf.mockResolvedValue(true);
  getAdmin.mockResolvedValue({ id: 'a1', event: { id: 'e1', slug: 's' } });
  updateEvent.mockResolvedValue({ retentionOverrideDays: 30 });
  const { prisma } = require('@/lib/prisma');
  prisma.event.findUnique.mockResolvedValue({ legacyGrandfathered: true });
  prisma.payment.findMany.mockResolvedValue([]);
});

describe('POST /api/admin/events/extend-retention', () => {
  it('rejects missing CSRF with 403', async () => {
    validateCsrf.mockResolvedValue(false);
    const res = await POST(req({ days: 30 }));
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated admin with 401', async () => {
    getAdmin.mockResolvedValue(null);
    const res = await POST(req({ days: 30 }));
    expect(res.status).toBe(401);
  });

  it('rejects admin without an event with 401', async () => {
    getAdmin.mockResolvedValue({ id: 'a1', event: null });
    const res = await POST(req({ days: 30 }));
    expect(res.status).toBe(401);
  });

  it('rejects non-integer days with 400', async () => {
    expect((await POST(req({ days: 'thirty' }))).status).toBe(400);
    expect((await POST(req({ days: 30.5 }))).status).toBe(400);
  });

  it('rejects days below 0 or above 365 with 400', async () => {
    expect((await POST(req({ days: -1 }))).status).toBe(400);
    expect((await POST(req({ days: 366 }))).status).toBe(400);
  });

  it('accepts days=0 (clears override) and days=365 (max)', async () => {
    expect((await POST(req({ days: 0 }))).status).toBe(200);
    expect((await POST(req({ days: 365 }))).status).toBe(200);
  });

  it('writes retentionOverrideDays and clears deletionWarningSentAt', async () => {
    const res = await POST(req({ days: 60 }));
    expect(res.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { retentionOverrideDays: 60, deletionWarningSentAt: null },
      select: { retentionOverrideDays: true },
    });
  });
});
