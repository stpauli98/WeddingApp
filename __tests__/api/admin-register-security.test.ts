/** @jest-environment node */
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
