import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import cloudinary from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_video_delete', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  // CSRF protection
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video_delete')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const guest = await getAuthenticatedGuest();
  if (!guest) return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Nedostaje ID videa.' }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video ne postoji.' }, { status: 404 });
  if (video.guestId !== guest.id) {
    return NextResponse.json({ error: 'Nemate pristup ovom videu.' }, { status: 403 });
  }

  if (video.storagePath) {
    await new Promise<void>((resolve) => {
      cloudinary.uploader.destroy(video.storagePath!, { resource_type: 'video' }, (error) => {
        if (error) console.error('[video-delete] Cloudinary destroy failed:', error);
        resolve();
      });
    });
  }

  // NOTE: lifetimeVideoCount is monotonic (anti-abuse) — do NOT decrement it here.
  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
