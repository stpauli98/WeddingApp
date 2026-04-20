import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import sharp from 'sharp';
import cloudinary from '@/lib/cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse, UploadApiOptions } from "cloudinary";
import type { PricingTier } from '@/lib/pricing-tiers';

// Per-guest lifetime counter (Guest.lifetimeUploadCount) replaces the
// former IP rate limit. Upload is an authenticated endpoint — throttling
// the authenticated subject is both fairer and more effective than
// bucketing by IP, and it survives the guest moving between Wi-Fi/mobile
// networks during a single event.

// Hard ceiling on request body: 10 MB per image × max 50 (premium tier) + 2 MB
// margin for form overhead. Finer per-image checks still run below.
const MAX_BODY_BYTES = 10 * 1024 * 1024 * 50 + 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Lifetime cap is 2× the tier's active image limit — a guest can re-upload
// once after a full gallery wipe, but not loop forever.
const LIFETIME_MULTIPLIER = 2;

// Authoritative MIME allowlist, checked against Sharp's decoded metadata.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

class LimitExceededError extends Error {
  constructor(public existing: number, public attempted: number, public limit: number) {
    super(`Image limit exceeded: have ${existing}, adding ${attempted}, limit ${limit}`);
    this.name = 'LimitExceededError';
  }
}

class LifetimeLimitError extends Error {
  constructor(public lifetimeUsed: number, public attempted: number, public limit: number) {
    super(`Lifetime upload limit: used ${lifetimeUsed}, adding ${attempted}, limit ${limit}`);
    this.name = 'LifetimeLimitError';
  }
}

type ProcessedUpload = {
  filename: string;
  imageUrl: string;
  publicId: string;
};

type ProcessResult =
  | { ok: true; upload: ProcessedUpload }
  | { ok: false; filename: string; error: string };

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken });
  response.cookies.set("csrf_token_guest_upload", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30,
    path: "/"
  });
  return response;
}

async function uploadToCloudinary(
  buffer: Buffer,
  tier: PricingTier
): Promise<{ url: string; publicId: string }> {
  const { PRICING_TIERS } = await import('@/lib/pricing-tiers');
  const config = PRICING_TIERS[tier] ?? PRICING_TIERS.free;

  const uploadOptions: UploadApiOptions = {
    folder: 'wedding-app',
    resource_type: 'image',
    tags: ['wedding-app', 'guest-upload'],
  };

  // Apply q_auto + f_auto ONLY when the tier wants a compressed stored
  // derivative. Premium/unlimited skip this so the stored asset is the
  // original; admin ZIP download fetches the same URL and therefore
  // receives the original back.
  if (!config.storeOriginal) {
    uploadOptions.transformation = [
      { quality: "auto" },
      { fetch_format: "auto" },
    ];
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

async function processImage(image: File, tier: PricingTier): Promise<ProcessResult> {
  const filename = image.name;
  try {
    if (image.size > MAX_IMAGE_BYTES) {
      return { ok: false, filename, error: `Slika ${filename} je veća od 10MB.` };
    }
    const buffer = Buffer.from(await image.arrayBuffer());

    // Sharp metadata is authoritative — the client-provided `image.type` can be spoofed.
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
      return { ok: false, filename, error: `Fajl ${filename} nije podržan format slike.` };
    }

    // .rotate() honours EXIF orientation; .toBuffer() drops all metadata by default,
    // which serves as the server-side EXIF strip for all formats (including HEIC/HEIF
    // where browser canvas can't decode for client-side stripping).
    const optimized = await sharp(buffer).rotate().toBuffer();

    const { url, publicId } = await uploadToCloudinary(optimized, tier);
    return { ok: true, upload: { filename, imageUrl: url, publicId } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return { ok: false, filename, error: msg };
  }
}

async function rollbackCloudinary(publicIds: string[]): Promise<void> {
  // Best-effort cleanup. Log failures but never throw — this runs from inside
  // an outer catch block and must not mask the original error.
  await Promise.all(
    publicIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          cloudinary.uploader.destroy(id, (err) => {
            if (err) console.error('[orphan-cleanup] failed for', id, err);
            resolve();
          });
        })
    )
  );
}

export async function POST(request: NextRequest) {
  // CSRF
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get("csrf_token_guest_upload")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { error: "Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo." },
      { status: 403 }
    );
  }

  // Body size cap
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Zahtjev je prevelik." }, { status: 413 });
  }

  // Auth
  const guestSession = await getAuthenticatedGuest();
  if (!guestSession) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }
  const guestId = guestSession.id;
  const MAX_IMAGES = guestSession.event.imageLimit || 10;
  const LIFETIME_LIMIT = MAX_IMAGES * LIFETIME_MULTIPLIER;

  // Parse form
  const formData = await request.formData();
  const images: File[] = formData.getAll("images").filter(Boolean) as File[];
  const message: string = (formData.get("message") as string | null) || "";

  // Message-only path
  if (message.trim() && images.length === 0) {
    try {
      await prisma.message.upsert({
        where: { guestId },
        update: { text: message },
        create: { guestId, text: message },
      });
      return NextResponse.json({ success: true, uploaded: 0, failed: [] });
    } catch (err) {
      console.error('[upload] message upsert failed', err);
      return NextResponse.json({ error: "Greška pri čuvanju poruke." }, { status: 500 });
    }
  }

  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Možete poslati najviše ${MAX_IMAGES} slika po zahtjevu.` },
      { status: 400 }
    );
  }

  // Phase 1: process each image independently. One bad file isolates to that file.
  const tier = guestSession.event.pricingTier;
  const results = await Promise.all(images.map((img) => processImage(img, tier)));
  const processedUploads = results.filter((r): r is Extract<ProcessResult, { ok: true }> => r.ok).map((r) => r.upload);
  const failed = results.filter((r): r is Extract<ProcessResult, { ok: false }> => !r.ok);

  if (processedUploads.length === 0) {
    // Every file failed validation/Cloudinary upload. Nothing was persisted; no rollback needed.
    return NextResponse.json(
      { error: "Nijedna slika nije prošla validaciju.", failed: failed.map((f) => ({ filename: f.filename, error: f.error })) },
      { status: 400 }
    );
  }

  // Phase 2: atomic count-check + inserts. Transaction serialises with other
  // concurrent uploads for the same guest, so the limit cannot be exceeded.
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lifetime gate first: once you've burned through 2× the tier, no
      // amount of deleting will free more slots.
      const guestRow = await tx.guest.findUnique({
        where: { id: guestId },
        select: { lifetimeUploadCount: true },
      });
      const lifetimeUsed = guestRow?.lifetimeUploadCount ?? 0;
      if (lifetimeUsed + processedUploads.length > LIFETIME_LIMIT) {
        throw new LifetimeLimitError(lifetimeUsed, processedUploads.length, LIFETIME_LIMIT);
      }

      // Active gallery cap.
      const existing = await tx.image.count({ where: { guestId } });
      if (existing + processedUploads.length > MAX_IMAGES) {
        throw new LimitExceededError(existing, processedUploads.length, MAX_IMAGES);
      }

      for (const { imageUrl, publicId } of processedUploads) {
        await tx.image.create({
          data: { guestId, imageUrl, storagePath: publicId, tier },
        });
      }

      // Monotonic increment. Delete never decrements this.
      await tx.guest.update({
        where: { id: guestId },
        data: { lifetimeUploadCount: { increment: processedUploads.length } },
      });
    });

    // Persist message if present (separate from image TX by design — message flow
    // can succeed on its own, and failure here does not invalidate uploads).
    if (message.trim()) {
      try {
        await prisma.message.upsert({
          where: { guestId },
          update: { text: message },
          create: { guestId, text: message },
        });
      } catch (err) {
        console.error('[upload] message upsert failed after image TX', err);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: processedUploads.length,
      failed: failed.map((f) => ({ filename: f.filename, error: f.error })),
    });
  } catch (err) {
    // Anything that threw inside or around the TX means the images we uploaded
    // to Cloudinary have no matching DB rows. Clean them up.
    await rollbackCloudinary(processedUploads.map((u) => u.publicId));

    if (err instanceof LifetimeLimitError) {
      return NextResponse.json(
        {
          error: `Dosegli ste ukupan limit upload-a za ovaj event (${err.limit} slika). Već ste poslali ${err.lifetimeUsed}, a pokušavate dodati ${err.attempted} više. Brisanje postojećih slika ne vraća ovaj limit.`,
          failed: failed.map((f) => ({ filename: f.filename, error: f.error })),
        },
        { status: 400 }
      );
    }

    if (err instanceof LimitExceededError) {
      return NextResponse.json(
        {
          error: `Ukupno možete imati najviše ${err.limit} slika. Trenutno imate ${err.existing}, a pokušali ste dodati ${err.attempted}.`,
          failed: failed.map((f) => ({ filename: f.filename, error: f.error })),
        },
        { status: 400 }
      );
    }

    console.error('[upload] transaction failed', err);
    return NextResponse.json({ error: "Došlo je do greške prilikom slanja." }, { status: 500 });
  }
}
