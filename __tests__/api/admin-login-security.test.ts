/** @jest-environment node */
// Use var so the declaration is hoisted (no TDZ) and the jest.mock factory
// can reference it when createRateLimiter is called at route module scope.
// eslint-disable-next-line no-var
var mockRlCheck = jest.fn().mockResolvedValue({ success: true, remaining: 4 });

jest.mock('@/lib/security/rate-limit', () => ({
  __esModule: true,
  createRateLimiter: jest.fn(() => ({ check: (...args: any[]) => mockRlCheck(...args) })),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    admin: { findUnique: jest.fn() },
    adminSession: { create: jest.fn(), deleteMany: jest.fn() },
  },
}));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn().mockResolvedValue(true),
  generateCsrfToken: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

import { POST } from '@/app/api/admin/login/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const mocks = {
  findUnique: prisma.admin.findUnique as jest.MockedFunction<any>,
  sessionCreate: prisma.adminSession.create as jest.MockedFunction<any>,
  sessionDelete: prisma.adminSession.deleteMany as jest.MockedFunction<any>,
  compare: bcrypt.compare as jest.MockedFunction<any>,
};

function buildReq(body: any): Request {
  return new Request('http://x/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mocks.sessionDelete.mockResolvedValue({ count: 0 });
  mocks.sessionCreate.mockResolvedValue({});
  mockRlCheck.mockClear();
  mockRlCheck.mockResolvedValue({ success: true, remaining: 4 });
});

it('calls bcrypt.compare even when admin does not exist (timing parity)', async () => {
  mocks.findUnique.mockResolvedValue(null);
  mocks.compare.mockResolvedValue(false);
  const res = await POST(buildReq({ email: 'nope@x.com', password: 'pw' }) as any);
  expect(mocks.compare).toHaveBeenCalled();
  expect(res.status).toBe(401);
});

it('normalizes email before findUnique', async () => {
  mocks.findUnique.mockResolvedValue(null);
  mocks.compare.mockResolvedValue(false);
  await POST(buildReq({ email: ' Foo@BAR.com ', password: 'pw' }) as any);
  expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: 'foo@bar.com' } });
});

it('issues 64-hex session token on success', async () => {
  mocks.findUnique.mockResolvedValue({ id: 'a1', passwordHash: 'h' });
  mocks.compare.mockResolvedValue(true);
  await POST(buildReq({ email: 'a@b.com', password: 'pw' }) as any);
  const token = mocks.sessionCreate.mock.calls[0][0].data.sessionToken;
  expect(token).toMatch(/^[0-9a-f]{64}$/);
});

it('returns 429 when rate-limit exceeded', async () => {
  mockRlCheck.mockResolvedValueOnce({ success: false, remaining: 0 });
  const res = await POST(buildReq({ email: 'a@b.com', password: 'pw' }) as any);
  expect(res.status).toBe(429);
});
