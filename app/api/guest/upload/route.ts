import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import sharp from 'sharp';
import cloudinary from '@/lib/cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

// Per-IP rate limit for uploads. App Router does not honour the legacy
// `export const config = { api: { bodyParser: { sizeLimit } } }` — size is
// enforced below via the Content-Length header.
declare global {
  var __guestUploadAttempts: Map<string, number[]> | undefined;
}
const uploadAttempts: Map<string, number[]> = globalThis.__guestUploadAttempts || new Map();
globalThis.__guestUploadAttempts = uploadAttempts;
// Each image is its own POST, so the cap has to accommodate batch uploads +
// retries. Premium tier allows 50 images → 50 POSTs in a batch, plus some
// room for individual retries on transient failures. 100/5min fits.
const UPLOAD_MAX = 100;
const UPLOAD_WINDOW_MS = 5 * 60 * 1000;
const UPLOAD_RATE_LIMIT_ENABLED = process.env.NODE_ENV !== 'development';

// Hard ceiling on request body: 10 MB per image × max 50 (premium tier) + 2 MB
// margin for form overhead. Finer per-image checks still run below.
const MAX_BODY_BYTES = 10 * 1024 * 1024 * 50 + 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Authoritative MIME allowlist, checked against Sharp's decoded metadata.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

class LimitExceededError extends Error {
  constructor(public existing: number, public attempted: number, public limit: number) {
    super(`Image limit exceeded: have ${existing}, adding ${attempted}, limit ${limit}`);
    this.name = 'LimitExceededError';
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

async function uploadToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'wedding-app',
        resource_type: 'image',
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        tags: ['wedding-app', 'guest-upload'],
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

async function processImage(image: File): Promise<ProcessResult> {
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

    const { url, publicId } = await uploadToCloudinary(optimized);
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

  // Per-IP rate limit. Disabled in development so heavy local testing
  // doesn't hit the cap; the in-memory state wouldn't survive a server
  // restart there anyway, so a bypass is equivalent.
  if (UPLOAD_RATE_LIMIT_ENABLED) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const recent = (uploadAttempts.get(ip) || []).filter((ts) => now - ts < UPLOAD_WINDOW_MS);
    if (recent.length >= UPLOAD_MAX) {
      return NextResponse.json(
        { error: "Previše upload zahtjeva. Pokušajte ponovo za nekoliko minuta." },
        { status: 429 }
      );
    }
    uploadAttempts.set(ip, [...recent, now]);
  }

  // Auth
  const guestSession = await getAuthenticatedGuest();
  if (!guestSession) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }
  const guestId = guestSession.id;
  const MAX_IMAGES = guestSession.event.imageLimit || 10;

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
  const results = await Promise.all(images.map(processImage));
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
      const existing = await tx.image.count({ where: { guestId } });
      if (existing + processedUploads.length > MAX_IMAGES) {
        throw new LimitExceededError(existing, processedUploads.length, MAX_IMAGES);
      }
      for (const { imageUrl, publicId } of processedUploads) {
        await tx.image.create({
          data: { guestId, imageUrl, storagePath: publicId },
        });
      }
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
