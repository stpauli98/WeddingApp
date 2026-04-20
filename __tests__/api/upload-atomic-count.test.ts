/**
 * @jest-environment node
 *
 * Verifies that the guest upload handler rejects batches that would push the
 * guest past `event.imageLimit`, runs the check inside the Prisma transaction
 * so concurrent requests can't both pass, and cleans up Cloudinary assets when
 * the transaction aborts.
 *
 * Regression guard for the non-atomic count bug where two concurrent POSTs
 * both saw count=2, both passed the check against limit=3, and both wrote —
 * putting the guest at 4 images.
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
  messageUpsert: prisma.message.upsert as Mocked,
  getGuest: getAuthenticatedGuest as Mocked,
  cloudinaryUploadStream: cloudinary.uploader.upload_stream as Mocked,
  cloudinaryDestroy: cloudinary.uploader.destroy as Mocked,
};

function buildRequest(files: Array<{ name: string; size?: number }>): Request {
  const form = new FormData();
  for (const f of files) {
    const bytes = new Uint8Array(f.size ?? 1024);
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

  mocks.getGuest.mockResolvedValue({
    id: 'guest-1',
    event: { imageLimit: 3, pricingTier: 'free' },
  });

  mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 0 });
  mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });

  // Cloudinary upload stream simulates success with a deterministic public_id.
  let counter = 0;
  mocks.cloudinaryUploadStream.mockImplementation((_opts: any, cb: any) => ({
    end: () => {
      counter += 1;
      cb(undefined, {
        secure_url: `https://cdn.example/img-${counter}.jpg`,
        public_id: `wedding-app/pub-${counter}`,
      });
    },
  }));

  // Default: $transaction invokes its callback with a tx that proxies to prisma mocks.
  mocks.transaction.mockImplementation(async (fn: any) =>
    fn({
      image: { count: mocks.imageCount, create: mocks.imageCreate },
      guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
    })
  );
});

describe('POST /api/guest/upload — atomic image count', () => {
  it('lets a batch through when count + new ≤ limit', async () => {
    mocks.imageCount.mockResolvedValue(1);
    mocks.imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }));

    const res = await POST(buildRequest([{ name: 'a.jpg' }, { name: 'b.jpg' }]) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploaded).toBe(2);
    expect(mocks.imageCreate).toHaveBeenCalledTimes(2);
    expect(mocks.cloudinaryDestroy).not.toHaveBeenCalled();
  });

  it('rejects the batch and rolls back Cloudinary when count + new > limit', async () => {
    // Guest already has 2 images, limit is 3, request adds 2 more → 4 > 3.
    mocks.imageCount.mockResolvedValue(2);

    const res = await POST(buildRequest([{ name: 'a.jpg' }, { name: 'b.jpg' }]) as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/najviše 3/);
    expect(mocks.imageCreate).not.toHaveBeenCalled();
    // Both Cloudinary uploads from phase 1 must be destroyed after the TX throws.
    expect(mocks.cloudinaryDestroy).toHaveBeenCalledTimes(2);
  });

  it('runs the count check inside the transaction (race-safe)', async () => {
    // Mock implementation records the order of operations: tx.image.count must
    // be called before tx.image.create for every file. If they lived in
    // separate queries the race window would reappear.
    const calls: string[] = [];
    mocks.imageCount.mockImplementation(async () => {
      calls.push('count');
      return 1;
    });
    mocks.imageCreate.mockImplementation(async ({ data }: any) => {
      calls.push('create');
      return { id: 'img', ...data };
    });

    await POST(buildRequest([{ name: 'a.jpg' }, { name: 'b.jpg' }]) as any);

    expect(calls).toEqual(['count', 'create', 'create']);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('cleans up Cloudinary when image.create itself rejects', async () => {
    mocks.imageCount.mockResolvedValue(0);
    mocks.imageCreate.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await POST(buildRequest([{ name: 'a.jpg' }]) as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/greške/);
    expect(mocks.cloudinaryDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.cloudinaryDestroy).toHaveBeenCalledWith(
      'wedding-app/pub-1',
      expect.any(Function)
    );
  });
});
