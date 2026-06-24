import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import {
  getVideoLimit,
  validateVideoMeta,
  derivePosterUrl,
  isOwnedVideoPublicId,
} from '@/lib/video-config';
import { assertCloudinaryUrl } from '../assertCloudinaryUrl';

function destroyVideo(publicId: string): Promise<void> {
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'video' }, (err) => {
      if (err) console.error('[video-confirm] orphan cleanup failed for', publicId, err);
      resolve();
    });
  });
}

export async function POST(request: NextRequest) {
  // CSRF — reuses the same cookie issued by the sign endpoint (GET /api/guest/upload/video-sign)
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  // Auth
  const guest = await getAuthenticatedGuest();
  if (!guest) return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });

  // Premium gate
  const limit = getVideoLimit(guest.event.pricingTier);
  if (limit <= 0) {
    return NextResponse.json({ error: 'Video nije dostupan za vaš paket.' }, { status: 403 });
  }

  // Parse body — only publicId is accepted from the client
  const body = await request.json().catch(() => ({})) as { publicId?: string };
  const { publicId } = body;

  // Validate the publicId is within our own folder (prevents pointing at arbitrary assets)
  if (!publicId || !isOwnedVideoPublicId(publicId)) {
    return NextResponse.json({ error: 'Neispravan video.' }, { status: 400 });
  }

  // Authoritative metadata straight from Cloudinary — never trust client-supplied values
  let resource: { duration?: number; bytes: number; secure_url: string };
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
  } catch {
    return NextResponse.json({ error: 'Video nije pronađen.' }, { status: 400 });
  }

  // Validate duration and size against server-enforced limits
  const durationSec = Math.ceil(resource.duration ?? 0);
  const check = validateVideoMeta({ durationSec, bytes: resource.bytes });
  if (!check.ok) {
    await destroyVideo(publicId);
    const msg =
      check.reason === 'duration'
        ? 'Video može trajati najviše 60 sekundi.'
        : 'Video je prevelik (max 100 MB).';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Defence-in-depth: confirm the URL came from Cloudinary
  try {
    assertCloudinaryUrl(resource.secure_url);
  } catch {
    await destroyVideo(publicId);
    return NextResponse.json({ error: 'Neispravan video URL.' }, { status: 400 });
  }

  const tier = guest.event.pricingTier;
  const posterUrl = derivePosterUrl(resource.secure_url);

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lifetime cap: 2× the active limit. Never decremented on delete.
      const guestRow = await tx.guest.findUnique({
        where: { id: guest.id },
        select: { lifetimeVideoCount: true },
      });
      const lifetime = guestRow?.lifetimeVideoCount ?? 0;
      if (lifetime + 1 > limit * 2) {
        throw new Error('LIFETIME');
      }

      // Active-count cap
      const active = await tx.video.count({ where: { guestId: guest.id } });
      if (active + 1 > limit) {
        throw new Error('ACTIVE');
      }

      const video = await tx.video.create({
        data: {
          guestId: guest.id,
          videoUrl: resource.secure_url,
          posterUrl,
          storagePath: publicId,
          durationSec,
          bytes: resource.bytes,
          tier,
        },
      });

      // Monotonic increment — never decremented even when videos are deleted
      await tx.guest.update({
        where: { id: guest.id },
        data: { lifetimeVideoCount: { increment: 1 } },
      });

      return video;
    });

    return NextResponse.json({
      success: true,
      video: {
        id: created.id,
        videoUrl: created.videoUrl,
        posterUrl: created.posterUrl,
        durationSec: created.durationSec,
      },
    });
  } catch (err) {
    // Any failure means the Cloudinary asset has no matching DB row — destroy it
    await destroyVideo(publicId);
    const msg =
      err instanceof Error && err.message === 'LIFETIME'
        ? 'Dosegli ste ukupan limit video upload-a za ovaj event.'
        : `Možete imati najviše ${limit} videa.`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
