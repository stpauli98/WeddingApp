/**
 * @jest-environment node
 *
 * Invariant: POST /api/admin/events derives `imageLimit` server-side from
 * `PricingPlan[tier]` and never trusts client-supplied imageLimit.
 *
 * Regression guard for the pricing drift bug where a fabricated DevTools POST
 * could produce { pricingTier: 'free', imageLimit: 999 }.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pricingPlan: { findUnique: jest.fn() },
    adminSession: { findUnique: jest.fn() },
    admin: { findUnique: jest.fn() },
    event: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn().mockResolvedValue(true),
  generateCsrfToken: jest.fn().mockResolvedValue({ token: 'test-csrf-token' }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (name: string) =>
      name === 'admin_session' ? { value: 'test-session-token' } : undefined,
  }),
}));

import { POST } from '@/app/api/admin/events/route';
import { prisma } from '@/lib/prisma';

type Mocked = jest.MockedFunction<any>;
const mocks = {
  pricingPlanFindUnique: prisma.pricingPlan.findUnique as Mocked,
  adminSessionFindUnique: prisma.adminSession.findUnique as Mocked,
  adminFindUnique: prisma.admin.findUnique as Mocked,
  eventFindFirst: prisma.event.findFirst as Mocked,
  eventFindUnique: prisma.event.findUnique as Mocked,
  eventCreate: prisma.event.create as Mocked,
};

function buildRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/admin/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': 'test-csrf-token',
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY_BASE = {
  coupleName: 'Test Couple',
  location: 'Test Location',
  date: '2030-01-01',
  slug: 'test-slug',
};

beforeEach(() => {
  jest.clearAllMocks();

  mocks.adminSessionFindUnique.mockResolvedValue({
    sessionToken: 'test-session-token',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    admin: { id: 'admin-1' },
  });
  mocks.adminFindUnique.mockResolvedValue({ language: 'sr' });
  mocks.eventFindFirst.mockResolvedValue(null);
  mocks.eventFindUnique.mockResolvedValue(null);
  mocks.eventCreate.mockImplementation(async ({ data }: any) => ({ id: 'event-1', ...data }));
});

describe('POST /api/admin/events — tier↔imageLimit invariant', () => {
  it('ignores client imageLimit=999 for tier=free, writes imageLimit=10 from PricingPlan', async () => {
    mocks.pricingPlanFindUnique.mockResolvedValue({ imageLimit: 10 });

    const res = await POST(
      buildRequest({ ...VALID_BODY_BASE, pricingTier: 'free', imageLimit: 999 })
    );

    expect(res.status).toBe(200);
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    const createArg = mocks.eventCreate.mock.calls[0][0];
    expect(createArg.data.pricingTier).toBe('free');
    expect(createArg.data.imageLimit).toBe(10);
  });

  it('ignores client imageLimit=3 for tier=basic, writes imageLimit=25 from PricingPlan', async () => {
    mocks.pricingPlanFindUnique.mockResolvedValue({ imageLimit: 25 });

    const res = await POST(
      buildRequest({ ...VALID_BODY_BASE, pricingTier: 'basic', imageLimit: 3 })
    );

    expect(res.status).toBe(200);
    const createArg = mocks.eventCreate.mock.calls[0][0];
    expect(createArg.data.pricingTier).toBe('basic');
    expect(createArg.data.imageLimit).toBe(25);
  });

  it('falls back to free tier when pricingTier is invalid; uses fallback imageLimit=3', async () => {
    mocks.pricingPlanFindUnique.mockResolvedValue(null);

    const res = await POST(
      buildRequest({ ...VALID_BODY_BASE, pricingTier: 'hackerTier', imageLimit: 999 })
    );

    expect(res.status).toBe(200);
    const createArg = mocks.eventCreate.mock.calls[0][0];
    expect(createArg.data.pricingTier).toBe('free');
    expect(createArg.data.imageLimit).toBe(3);
  });

  it('uses PricingPlan value when present, not the hardcoded fallback', async () => {
    mocks.pricingPlanFindUnique.mockResolvedValue({ imageLimit: 50 });

    const res = await POST(
      buildRequest({ ...VALID_BODY_BASE, pricingTier: 'free', imageLimit: 1 })
    );

    expect(res.status).toBe(200);
    const createArg = mocks.eventCreate.mock.calls[0][0];
    expect(createArg.data.imageLimit).toBe(50);
  });
});

describe('P2002 handling', () => {
  beforeEach(() => {
    mocks.adminSessionFindUnique.mockResolvedValue({
      admin: { id: 'adm1' }, expiresAt: new Date(Date.now() + 3600_000),
    });
    mocks.adminFindUnique.mockResolvedValue({ language: 'sr' });
    mocks.pricingPlanFindUnique.mockResolvedValue({ imageLimit: 3 });
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue(null);
  });

  it('returns 409 when adminId unique constraint races', async () => {
    mocks.eventCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['adminId'] } });
    const res = await POST(buildRequest({ ...VALID_BODY_BASE }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Već ste kreirali događaj/);
  });

  it('returns 409 when slug unique constraint races', async () => {
    mocks.eventCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } });
    const res = await POST(buildRequest({ ...VALID_BODY_BASE }));
    expect(res.status).toBe(409);
  });
});

describe('reserved slug rejection', () => {
  beforeEach(() => {
    mocks.adminSessionFindUnique.mockResolvedValue({
      admin: { id: 'adm1' }, expiresAt: new Date(Date.now() + 3600_000),
    });
    mocks.adminFindUnique.mockResolvedValue({ language: 'sr' });
    mocks.pricingPlanFindUnique.mockResolvedValue({ imageLimit: 3 });
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue(null);
  });

  it('rejects slug "admin" with 409', async () => {
    const res = await POST(buildRequest({ ...VALID_BODY_BASE, slug: 'admin' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/rezervisan/i);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it('rejects slug "api" case-insensitively', async () => {
    const res = await POST(buildRequest({ ...VALID_BODY_BASE, slug: 'API' }));
    expect(res.status).toBe(409);
  });

  it('accepts non-reserved slug', async () => {
    mocks.eventCreate.mockResolvedValue({ id: 'e1', slug: 'ana-marko' });
    const res = await POST(buildRequest({ ...VALID_BODY_BASE, slug: 'ana-marko' }));
    expect(res.status).toBe(200);
  });
});
