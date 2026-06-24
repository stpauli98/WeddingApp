/** @jest-environment node */
// __tests__/api/video-sign.test.ts
// Set env vars BEFORE module imports so cloudinary.utils.api_sign_request has the secret.
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

jest.mock('@/lib/guest-auth', () => ({
  getAuthenticatedGuest: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      count: jest.fn(),
    },
    guest: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock next/headers cookies() used in GET and POST
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'csrf_token_guest_video') return { value: 'tok' };
      return undefined;
    }),
  })),
}));

import { POST, GET } from '@/app/api/guest/upload/video-sign/route';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { prisma } from '@/lib/prisma';

function reqWithCsrf(token: string) {
  return new Request('http://x/api/guest/upload/video-sign', {
    method: 'POST',
    headers: { 'x-csrf-token': token, cookie: `csrf_token_guest_video=${token}` },
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('GET returns a csrfToken', async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.csrfToken).toBe('string');
  expect(body.csrfToken.length).toBeGreaterThan(10);
});

it('POST rejects when CSRF token mismatch', async () => {
  const req = new Request('http://x/api/guest/upload/video-sign', {
    method: 'POST',
    headers: { 'x-csrf-token': 'wrong-token', cookie: 'csrf_token_guest_video=tok' },
  }) as any;
  const res = await POST(req);
  expect(res.status).toBe(403);
});

it('rejects non-premium guests with 403', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'free' },
  });
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(403);
  const body = await res.json();
  expect(body.error).toMatch(/premium/i);
});

it('rejects basic-tier guests with 403', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'basic' },
  });
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(403);
});

it('rejects unauthenticated request with 401', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue(null);
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(401);
});

it('signs for a premium guest under the limit', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'premium' },
  });
  jest.spyOn(prisma.video, 'count').mockResolvedValue(0 as any);
  jest.spyOn(prisma.guest, 'findUnique').mockResolvedValue({ lifetimeVideoCount: 0 } as any);
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.signature).toEqual(expect.any(String));
  expect(body.folder).toBe('wedding-app/videos');
  expect(body.apiKey).toBe('test-api-key');
  expect(body.cloudName).toBe('test-cloud');
  expect(typeof body.timestamp).toBe('number');
});

it('rejects when active video count >= limit', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'premium' },
  });
  // Assume premium videoLimit is 3; mock active count at limit
  jest.spyOn(prisma.video, 'count').mockResolvedValue(3 as any);
  jest.spyOn(prisma.guest, 'findUnique').mockResolvedValue({ lifetimeVideoCount: 3 } as any);
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/limit/i);
});

it('rejects when lifetime video count >= limit*2', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'premium' },
  });
  jest.spyOn(prisma.video, 'count').mockResolvedValue(0 as any);
  jest.spyOn(prisma.guest, 'findUnique').mockResolvedValue({ lifetimeVideoCount: 6 } as any);
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/limit/i);
});
