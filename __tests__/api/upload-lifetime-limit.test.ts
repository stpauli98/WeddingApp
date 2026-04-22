/**
 * @jest-environment node
 *
 * Verifies the lifetime upload cap: a guest cannot exceed event.imageLimit * 2
 * uploads across the lifetime of the event, regardless of how many they've
 * deleted. Deletes drop active gallery count but not the lifetime counter.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      count: jest.fn(),
      create: jest.fn(),
    },
    guest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/guest-auth', () => ({
  getAuthenticatedGuest: jest.fn(),
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn((id: string, cb: (err: unknown) => void) => cb(null)),
    },
  },
}));

jest.mock('sharp', () => {
  const instance = {
    metadata: jest.fn().mockResolvedValue({ format: 'jpeg' }),
    rotate: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized')),
  };
  return jest.fn(() => instance);
});

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (name: string) =>
      name === 'csrf_token_guest_upload' ? { value: 'test-token' } : undefined,
  }),
}));

import { POST } from '@/app/api/guest/upload/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import cloudinary from '@/lib/cloudinary';

type Mocked = jest.MockedFunction<any>;
const mocks = {
  transaction: prisma.$transaction as Mocked,
  imageCount: prisma.image.count as Mocked,
  imageCreate: prisma.image.create as Mocked,
  guestFindUnique: prisma.guest.findUnique as Mocked,
  guestUpdate: prisma.guest.update as Mocked,
  getGuest: getAuthenticatedGuest as Mocked,
  cloudinaryUploadStream: cloudinary.uploader.upload_stream as Mocked,
  cloudinaryDestroy: cloudinary.uploader.destroy as Mocked,
};

function buildRequest(files: Array<{ name: string }>): Request {
  const form = new FormData();
  for (const f of files) {
    const bytes = new Uint8Array(1024);
    form.append('images', new File([bytes], f.name, { type: 'image/jpeg' }));
  }
  return new Request('http://localhost/api/guest/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': 'test-token',
      'x-forwarded-for': '1.2.3.4',
      'content-length': '1024',
    },
    body: form as any,
  });
}

beforeEach(() => {
  jest.clearAllMocks();

  // Tier limit = 25 → lifetime cap = 50.
  mocks.getGuest.mockResolvedValue({
    id: 'guest-1',
    event: { imageLimit: 25, pricingTier: 'basic' },
  });

  let counter = 0;
  mocks.cloudinaryUploadStream.mockImplementation((_opts: any, cb: any) => ({
    end: () => {
      counter += 1;
      cb(undefined, {
        secure_url: `https://res.cloudinary.com/dd6zeo4s9/image/upload/img-${counter}.jpg`,
        public_id: `wedding-app/pub-${counter}`,
      });
    },
  }));

  mocks.imageCount.mockResolvedValue(0);
  mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });
  mocks.imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }));

  mocks.transaction.mockImplementation(async (fn: any) =>
    fn({
      image: { count: mocks.imageCount, create: mocks.imageCreate },
      guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
    })
  );
});

describe('POST /api/guest/upload — lifetime cap', () => {
  it('accepts upload when lifetimeUsed + new ≤ 2× tier', async () => {
    // 40 used + 5 new = 45 ≤ 50. Active count 0, so active cap also fine.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 40 });

    const res = await POST(
      buildRequest([
        { name: '1.jpg' }, { name: '2.jpg' }, { name: '3.jpg' }, { name: '4.jpg' }, { name: '5.jpg' },
      ]) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploaded).toBe(5);
    expect(mocks.guestUpdate).toHaveBeenCalledWith({
      where: { id: 'guest-1' },
      data: { lifetimeUploadCount: { increment: 5 } },
    });
  });

  it('rejects when lifetimeUsed + new > 2× tier and rolls back Cloudinary', async () => {
    // 48 used + 5 new = 53 > 50.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 48 });

    const res = await POST(
      buildRequest([
        { name: '1.jpg' }, { name: '2.jpg' }, { name: '3.jpg' }, { name: '4.jpg' }, { name: '5.jpg' },
      ]) as any
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/ukupan limit upload-a/);
    expect(mocks.imageCreate).not.toHaveBeenCalled();
    expect(mocks.guestUpdate).not.toHaveBeenCalled();
    // Cloudinary uploads happen in phase 1, before the transaction — they
    // must be cleaned up when the TX aborts.
    expect(mocks.cloudinaryDestroy).toHaveBeenCalledTimes(5);
  });

  it('does not decrement the lifetime counter on a successful upload', async () => {
    // Regression guard — a bug where DELETE or errors accidentally decremented
    // lifetimeUploadCount would defeat the whole anti-abuse mechanism.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 10 });

    await POST(buildRequest([{ name: 'a.jpg' }, { name: 'b.jpg' }]) as any);

    const updateCalls = mocks.guestUpdate.mock.calls;
    expect(updateCalls).toHaveLength(1);
    const updateArg = updateCalls[0][0];
    // Only an `increment` operation is allowed — never a `decrement` or a
    // direct number that could go backwards.
    expect(updateArg.data.lifetimeUploadCount).toHaveProperty('increment');
    expect(updateArg.data.lifetimeUploadCount).not.toHaveProperty('decrement');
    expect(updateArg.data.lifetimeUploadCount.increment).toBe(2);
  });
});
