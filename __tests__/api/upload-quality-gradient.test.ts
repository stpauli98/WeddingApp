/**
 * @jest-environment node
 *
 * Verifies the upload handler applies Cloudinary q_auto+f_auto transformation
 * ONLY for free/basic tiers. Premium/unlimited uploads must reach Cloudinary
 * with no transformation parameter so the stored asset is the original.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: { count: jest.fn(), create: jest.fn() },
    guest: { findUnique: jest.fn(), update: jest.fn() },
    message: { upsert: jest.fn() },
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
import type { PricingTier } from '@/lib/pricing-tiers';

type Mocked = jest.MockedFunction<any>;
const mocks = {
  transaction: prisma.$transaction as Mocked,
  imageCount: prisma.image.count as Mocked,
  imageCreate: prisma.image.create as Mocked,
  guestFindUnique: prisma.guest.findUnique as Mocked,
  guestUpdate: prisma.guest.update as Mocked,
  getGuest: getAuthenticatedGuest as Mocked,
  uploadStream: cloudinary.uploader.upload_stream as Mocked,
};

function buildRequest(): Request {
  const form = new FormData();
  const bytes = new Uint8Array(1024);
  form.append('images', new File([bytes], 'a.jpg', { type: 'image/jpeg' }));
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

function setup(tier: PricingTier, imageLimit: number) {
  mocks.getGuest.mockResolvedValue({
    id: 'guest-1',
    event: { imageLimit, pricingTier: tier },
  });
  mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 0 });
  mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });
  mocks.imageCount.mockResolvedValue(0);
  mocks.imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }));
  mocks.transaction.mockImplementation(async (fn: any) =>
    fn({
      image: { count: mocks.imageCount, create: mocks.imageCreate },
      guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
    })
  );
  mocks.uploadStream.mockImplementation((_opts: any, cb: any) => ({
    end: () => cb(undefined, { secure_url: 'https://cdn/x.jpg', public_id: 'wedding-app/x' }),
  }));
}

describe('POST /api/guest/upload — tier-conditional Cloudinary transformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('free tier: passes q_auto+f_auto transformation', async () => {
    setup('free', 10);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toEqual([
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ]);
  });

  it('basic tier: passes q_auto+f_auto transformation', async () => {
    setup('basic', 25);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toEqual([
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ]);
  });

  it('premium tier: omits transformation (store original)', async () => {
    setup('premium', 50);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toBeUndefined();
  });

  it('unlimited tier: omits transformation (store original)', async () => {
    setup('unlimited', 999);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toBeUndefined();
  });

  it('image.create receives tier snapshot', async () => {
    setup('premium', 50);
    await POST(buildRequest() as any);
    expect(mocks.imageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ tier: 'premium' }),
    });
  });
});
