/** @jest-environment node */
import { POST } from '@/app/api/guest/upload/video-confirm/route';

jest.mock('@/lib/guest-auth', () => ({ getAuthenticatedGuest: jest.fn() }));
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: { resource: jest.fn() },
    uploader: { destroy: jest.fn((_id, _opts, cb) => cb(null, { result: 'ok' })) },
  },
}));

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'csrf_token_guest_video') return { value: 'tok' };
      return undefined;
    }),
  })),
}));

import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

function req(body: object, token = 'tok') {
  return new Request('http://x/api/guest/upload/video-confirm', {
    method: 'POST',
    headers: {
      'x-csrf-token': token,
      cookie: `csrf_token_guest_video=${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as any;
}

const premiumGuest = {
  id: 'g1',
  event: { id: 'e1', pricingTier: 'premium' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue(premiumGuest);
  // Default: destroy succeeds
  (cloudinary.uploader.destroy as jest.Mock).mockImplementation(
    (_id: string, _opts: object, cb: (err: null, res: object) => void) =>
      cb(null, { result: 'ok' })
  );
});

// --- Test 1 (from brief): >60s video is destroyed and returns 400 ---
it('destroys and rejects a video longer than 60s', async () => {
  (cloudinary.api.resource as jest.Mock).mockResolvedValue({
    duration: 90,
    bytes: 5_000_000,
    secure_url:
      'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/a.mp4',
  });
  const res = await POST(req({ publicId: 'wedding-app/videos/a' }));
  expect(res.status).toBe(400);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
    'wedding-app/videos/a',
    { resource_type: 'video' },
    expect.any(Function)
  );
});

// --- Test 2 (from brief): publicId outside our folder → 400, api.resource NOT called ---
it('rejects a public_id outside our folder', async () => {
  const res = await POST(req({ publicId: 'wedding-app/a' }));
  expect(res.status).toBe(400);
  expect(cloudinary.api.resource).not.toHaveBeenCalled();
});

// --- Test 3: happy path — valid video → Video row created, lifetime incremented ---
it('happy path: creates Video row and increments lifetimeVideoCount', async () => {
  (cloudinary.api.resource as jest.Mock).mockResolvedValue({
    duration: 30,
    bytes: 10_000_000,
    secure_url:
      'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/b.mp4',
  });

  // Spy on prisma.$transaction to simulate DB ops
  const fakeVideo = {
    id: 'v1',
    videoUrl:
      'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/b.mp4',
    posterUrl:
      'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/b.jpg',
    durationSec: 30,
  };

  jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
    // Simulate tx object
    const tx = {
      guest: {
        findUnique: jest.fn().mockResolvedValue({ lifetimeVideoCount: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
      video: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(fakeVideo),
      },
    };
    return fn(tx);
  });

  const res = await POST(req({ publicId: 'wedding-app/videos/b' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.video.id).toBe('v1');
  expect(body.video.durationSec).toBe(30);
  // Destroy must NOT have been called on the happy path
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

// --- Test 4: over active-count limit → destroy + 400 ---
it('destroys orphan and returns 400 when active video count is at limit', async () => {
  (cloudinary.api.resource as jest.Mock).mockResolvedValue({
    duration: 20,
    bytes: 5_000_000,
    secure_url:
      'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/c.mp4',
  });

  jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
    const tx = {
      guest: {
        findUnique: jest.fn().mockResolvedValue({ lifetimeVideoCount: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
      video: {
        // premium tier allows 3 videos; already at limit
        count: jest.fn().mockResolvedValue(3),
        create: jest.fn(),
      },
    };
    return fn(tx);
  });

  const res = await POST(req({ publicId: 'wedding-app/videos/c' }));
  expect(res.status).toBe(400);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
    'wedding-app/videos/c',
    { resource_type: 'video' },
    expect.any(Function)
  );
});
