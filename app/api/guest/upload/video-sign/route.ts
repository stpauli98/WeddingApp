import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { getVideoLimit, VIDEO_FOLDER } from '@/lib/video-config';

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_video', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  });
  return response;
}

export async function POST(request: NextRequest) {
  // CSRF gate
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { error: 'Neispravan CSRF token. Osvježite stranicu.' },
      { status: 403 },
    );
  }

  // Auth gate
  const guest = await getAuthenticatedGuest();
  if (!guest) {
    return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });
  }

  // Tier gate — only tiers with videoLimit > 0 may upload video
  const limit = getVideoLimit(guest.event.pricingTier);
  if (limit <= 0) {
    return NextResponse.json(
      { error: 'Video je dostupan samo za premium pakete.' },
      { status: 403 },
    );
  }

  // Slot pre-gate (authoritative re-check happens on confirm)
  const [active, guestRow] = await Promise.all([
    prisma.video.count({ where: { guestId: guest.id } }),
    prisma.guest.findUnique({ where: { id: guest.id }, select: { lifetimeVideoCount: true } }),
  ]);

  if (active >= limit) {
    return NextResponse.json(
      { error: `Dosegli ste limit od ${limit} videa.` },
      { status: 400 },
    );
  }

  if ((guestRow?.lifetimeVideoCount ?? 0) >= limit * 2) {
    return NextResponse.json(
      { error: 'Dosegli ste ukupan limit video upload-a za ovaj event.' },
      { status: 400 },
    );
  }

  // Sign the upload params for Cloudinary direct upload
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder: VIDEO_FOLDER, timestamp };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder: VIDEO_FOLDER,
  });
}
