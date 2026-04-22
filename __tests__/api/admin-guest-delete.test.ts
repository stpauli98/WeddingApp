/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    guest: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    image: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    message: {
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/csrf', () => ({ validateCsrfToken: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      destroy: jest.fn((_id: string, cb: (err: unknown, result: unknown) => void) => {
        cb(null, { result: 'ok' });
      }),
    },
  },
}));

import { DELETE } from '@/app/api/admin/guest/[id]/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const m = {
  adminAuth: getAuthenticatedAdmin as jest.MockedFunction<any>,
  guestFind: prisma.guest.findUnique as jest.MockedFunction<any>,
  guestDelete: prisma.guest.delete as jest.MockedFunction<any>,
  imageFindMany: prisma.image.findMany as jest.MockedFunction<any>,
  imageDeleteMany: prisma.image.deleteMany as jest.MockedFunction<any>,
  messageDeleteMany: prisma.message.deleteMany as jest.MockedFunction<any>,
  transaction: prisma.$transaction as jest.MockedFunction<any>,
};

function req(): Request {
  return new Request('http://x/api/admin/guest/g1', {
    method: 'DELETE',
    headers: { 'x-csrf-token': 'valid' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  m.transaction.mockImplementation(async (ops: any[]) => {
    for (const op of ops) await op;
  });
});

it('returns 401 when not authenticated', async () => {
  m.adminAuth.mockResolvedValue(null);
  const res = await DELETE(req(), { params: Promise.resolve({ id: 'g1' }) });
  expect(res.status).toBe(401);
});

it('returns 404 when guest does not exist', async () => {
  m.adminAuth.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  m.guestFind.mockResolvedValue(null);
  const res = await DELETE(req(), { params: Promise.resolve({ id: 'g1' }) });
  expect(res.status).toBe(404);
});

it("returns 403 when guest belongs to a different admin's event", async () => {
  m.adminAuth.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  m.guestFind.mockResolvedValue({ id: 'g1', eventId: 'e2' });
  const res = await DELETE(req(), { params: Promise.resolve({ id: 'g1' }) });
  expect(res.status).toBe(403);
  expect(m.guestDelete).not.toHaveBeenCalled();
});

it('cascades: deletes images, message, then guest on happy path', async () => {
  m.adminAuth.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  m.guestFind.mockResolvedValue({ id: 'g1', eventId: 'e1' });
  m.imageFindMany.mockResolvedValue([
    { id: 'img1', storagePath: 'cloud/1' },
    { id: 'img2', storagePath: 'cloud/2' },
  ]);
  m.imageDeleteMany.mockResolvedValue({ count: 2 });
  m.messageDeleteMany.mockResolvedValue({ count: 1 });
  m.guestDelete.mockResolvedValue({ id: 'g1' });

  const res = await DELETE(req(), { params: Promise.resolve({ id: 'g1' }) });
  expect(res.status).toBe(200);

  expect(m.messageDeleteMany).toHaveBeenCalledWith({ where: { guestId: 'g1' } });
  expect(m.imageDeleteMany).toHaveBeenCalledWith({ where: { guestId: 'g1' } });
  expect(m.guestDelete).toHaveBeenCalledWith({ where: { id: 'g1' } });
});

it('still deletes DB rows if Cloudinary destroy rejects', async () => {
  m.adminAuth.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  m.guestFind.mockResolvedValue({ id: 'g1', eventId: 'e1' });
  m.imageFindMany.mockResolvedValue([{ id: 'img1', storagePath: 'cloud/1' }]);
  m.imageDeleteMany.mockResolvedValue({ count: 1 });
  m.messageDeleteMany.mockResolvedValue({ count: 0 });
  m.guestDelete.mockResolvedValue({ id: 'g1' });

  const cloudinary = (await import('@/lib/cloudinary')).default;
  (cloudinary.uploader.destroy as jest.Mock).mockImplementation(
    (_id: string, cb: (err: unknown) => void) => cb(new Error('cloudinary down'))
  );

  const res = await DELETE(req(), { params: Promise.resolve({ id: 'g1' }) });
  expect(res.status).toBe(200);
  expect(m.guestDelete).toHaveBeenCalled();
});
