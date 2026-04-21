/** @jest-environment node */
var mockRlCheck = jest.fn();
jest.mock('@/lib/security/rate-limit', () => ({
  __esModule: true,
  createRateLimiter: jest.fn(() => ({ check: (...args: any[]) => mockRlCheck(...args) })),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    admin: { findUnique: jest.fn(), create: jest.fn() },
    adminSession: { create: jest.fn() },
  },
}));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn().mockResolvedValue(true),
  generateCsrfToken: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

import { POST } from '@/app/api/admin/register/route';
import { prisma } from '@/lib/prisma';

const m = {
  findUnique: prisma.admin.findUnique as jest.MockedFunction<any>,
  create: prisma.admin.create as jest.MockedFunction<any>,
  sessionCreate: prisma.adminSession.create as jest.MockedFunction<any>,
};

const VALID = { email: 'a@b.com', password: 'Passw0rd!!', firstName: 'Ana', lastName: 'Marko' };
function reqWith(body: any) {
  return new Request('http://x/api/admin/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRlCheck.mockClear();
  mockRlCheck.mockResolvedValue({ success: true, remaining: 4 });
  m.findUnique.mockResolvedValue(null);
  m.create.mockResolvedValue({ id: 'id1', email: 'a@b.com' });
  m.sessionCreate.mockResolvedValue({});
});

it('normalizes email on findUnique and create', async () => {
  await POST(reqWith({ ...VALID, email: ' Foo@BAR.com ' }) as any);
  expect(m.findUnique).toHaveBeenCalledWith({ where: { email: 'foo@bar.com' } });
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ email: 'foo@bar.com' }),
  }));
});

it('rejects weak password (single class)', async () => {
  const res = await POST(reqWith({ ...VALID, password: 'aaaaaaaaaa' }) as any);
  expect(res.status).toBe(400);
});

it('rejects short password', async () => {
  const res = await POST(reqWith({ ...VALID, password: 'Abc12' }) as any);
  expect(res.status).toBe(400);
});

it('accepts 2-class password of length 10', async () => {
  const res = await POST(reqWith({ ...VALID, password: 'password10' }) as any);
  expect(res.status).toBe(200);
});

it('issues 64-hex session token', async () => {
  await POST(reqWith(VALID) as any);
  const token = m.sessionCreate.mock.calls[0][0].data.sessionToken;
  expect(token).toMatch(/^[0-9a-f]{64}$/);
});

it('returns 429 when rate-limit exceeded', async () => {
  mockRlCheck.mockResolvedValueOnce({ success: false, remaining: 0 });
  const res = await POST(reqWith(VALID) as any);
  expect(res.status).toBe(429);
});

import bcrypt from 'bcryptjs';
const hashSpy = bcrypt.hash as jest.MockedFunction<any>;

it('runs bcrypt.hash even when admin already exists (timing parity)', async () => {
  m.findUnique.mockResolvedValue({ id: 'existing', email: 'a@b.com' });
  hashSpy.mockClear();
  const res = await POST(reqWith(VALID) as any);
  expect(hashSpy).toHaveBeenCalled();
  expect(m.create).not.toHaveBeenCalled();
  expect(res.status).toBe(200);
});

it('returns generic 200 without session cookie for existing email', async () => {
  m.findUnique.mockResolvedValue({ id: 'existing', email: 'a@b.com' });
  const res = await POST(reqWith(VALID) as any);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.requiresAction).toBe('check_existing');
  expect(body.admin).toBeUndefined();
  expect(m.sessionCreate).not.toHaveBeenCalled();
});

it('returns success + admin payload for genuinely new email', async () => {
  m.findUnique.mockResolvedValue(null);
  const res = await POST(reqWith(VALID) as any);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.admin).toBeDefined();
  expect(body.requiresAction).toBeUndefined();
});
