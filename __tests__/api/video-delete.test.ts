/** @jest-environment node */
import { DELETE } from '@/app/api/guest/videos/delete/route';

jest.mock('@/lib/guest-auth', () => ({ getAuthenticatedGuest: jest.fn() }));
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { destroy: jest.fn((_i: string, _o: object, cb: (err: null, res: object) => void) => cb(null, {})) } },
}));

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'csrf_token_guest_video_delete') return { value: 'tok' };
      return undefined;
    }),
  })),
}));

import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

function req(id: string, token = 'tok') {
  return new Request(`http://x/api/guest/videos/delete?id=${id}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': token, cookie: `csrf_token_guest_video_delete=${token}` },
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset destroy mock to default success callback
  (cloudinary.uploader.destroy as jest.Mock).mockImplementation(
    (_i: string, _o: object, cb: (err: null, res: object) => void) => cb(null, {})
  );
});

it('refuses to delete a video the guest does not own', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  jest.spyOn(prisma.video, 'findUnique').mockResolvedValue({ id: 'v1', guestId: 'OTHER', storagePath: 'wedding-app/videos/a' } as any);
  const res = await DELETE(req('v1'));
  expect(res.status).toBe(403);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it('deletes an owned video with resource_type video', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  jest.spyOn(prisma.video, 'findUnique').mockResolvedValue({ id: 'v1', guestId: 'g1', storagePath: 'wedding-app/videos/a' } as any);
  jest.spyOn(prisma.video, 'delete').mockResolvedValue({} as any);
  const res = await DELETE(req('v1'));
  expect(res.status).toBe(200);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('wedding-app/videos/a', { resource_type: 'video' }, expect.any(Function));
});

it('returns 403 on CSRF mismatch', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  const badReq = new Request('http://x/api/guest/videos/delete?id=v1', {
    method: 'DELETE',
    headers: { 'x-csrf-token': 'wrong-token', cookie: 'csrf_token_guest_video_delete=tok' },
  }) as any;
  const res = await DELETE(badReq);
  expect(res.status).toBe(403);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it('returns 400 when id is missing', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  const noIdReq = new Request('http://x/api/guest/videos/delete', {
    method: 'DELETE',
    headers: { 'x-csrf-token': 'tok', cookie: 'csrf_token_guest_video_delete=tok' },
  }) as any;
  const res = await DELETE(noIdReq);
  expect(res.status).toBe(400);
});

it('returns 404 when video does not exist', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  jest.spyOn(prisma.video, 'findUnique').mockResolvedValue(null);
  const res = await DELETE(req('nonexistent'));
  expect(res.status).toBe(404);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});
