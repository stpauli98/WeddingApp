import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

// Per-IP rate limit for uploads. App Router does not honour the legacy
// `export const config = { api: { bodyParser: { sizeLimit } } }` — size is
// enforced below via the Content-Length header.
declare global {
  var __guestUploadAttempts: Map<string, number[]> | undefined;
}
const uploadAttempts: Map<string, number[]> = globalThis.__guestUploadAttempts || new Map();
globalThis.__guestUploadAttempts = uploadAttempts;
const UPLOAD_MAX = 20;
const UPLOAD_WINDOW_MS = 5 * 60 * 1000;

// Hard ceiling on request body: 10 MB per image × max 50 (premium tier) + 2 MB
// margin for form overhead. Finer per-image checks still run below.
const MAX_BODY_BYTES = 10 * 1024 * 1024 * 50 + 2 * 1024 * 1024;

// Authoritative MIME allowlist, checked against Sharp's decoded metadata.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken });
  response.cookies.set("csrf_token_guest_upload", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minuta
    path: "/"
  });
  return response;
}

import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import sharp from 'sharp';
import cloudinary from '@/lib/cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

type UploadResult = { success: boolean; images: number } | { error: string };

/**
 * Upload pojedinačnih slika ili poruke gosta u bazu.
 * Poruka NIKAD ne ide u bucket, slike NIKAD ne idu u message tabelu.
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  // CSRF zaštita
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get("csrf_token_guest_upload")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: "Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo." }, { status: 403 });
  }

  // Body size cap — reject oversized uploads before reading into memory.
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Zahtjev je prevelik." },
      { status: 413 }
    );
  }

  // Per-IP rate limiting.
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

  try {
    // --- Validacija korisnika putem session tokena ---
    const guestSession = await getAuthenticatedGuest();
    if (!guestSession) return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
    const guestId = guestSession.id;

    // --- Parsiranje forme ---
    const formData = await request.formData();
    const images: File[] = formData.getAll("images").filter(Boolean) as File[];
    const message: string = (formData.get("message") as string | null) || "";

    const MAX_IMAGES = guestSession.event.imageLimit || 10;

    // Ako imamo samo poruku, obradi je i vrati odgovor
    if (message.trim() && images.length === 0) {
      await prisma.message.upsert({
        where: { guestId },
        update: { text: message },
        create: { guestId, text: message },
      });
      return NextResponse.json({ success: true, images: 0 });
    }

    // --- Validacija broja slika ---
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Možete poslati najviše ${MAX_IMAGES} slika` }, { status: 400 });
    }

    // Provjeri ukupan broj slika (postojeće + nove)
    const currentImagesCount = await prisma.image.count({ where: { guestId } });
    if (currentImagesCount + images.length > MAX_IMAGES) {
      return NextResponse.json({
        error: `Ukupno možete imati najviše ${MAX_IMAGES} slika. Trenutno imate ${currentImagesCount}, a pokušavate dodati ${images.length} novih.`
      }, { status: 400 });
    }

    // --- Upload slika na Cloudinary i upis u bazu ---
    const uploadedImages: any[] = [];
    // Maksimalna veličina slike (Cloudinary free plan: 10MB po slici)
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Obradi svaku sliku pojedinačno
    for (const image of images) {
      try {
        // Validacija veličine slike
        if (image.size > maxSize) {
          return NextResponse.json({
            error: `Slika ${image.name} je veća od 10MB. Molimo vas da smanjite rezoluciju ili veličinu slike.`
          }, { status: 400 });
        }

        // Konvertuj sliku za optimizaciju
        const buffer = Buffer.from(await image.arrayBuffer());
        let optimizedBuffer: Buffer;
        try {
          // Sharp's metadata is the authoritative format check — `image.type`
          // comes from the client and can be spoofed.
          const meta = await sharp(buffer).metadata();
          if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
            return NextResponse.json(
              { error: `Fajl ${image.name} nije podržan format slike.` },
              { status: 400 }
            );
          }
          optimizedBuffer = await sharp(buffer)
            .rotate() // Automatski ispravlja orijentaciju na osnovu EXIF podataka
            .toBuffer();
        } catch (err: any) {
          return NextResponse.json({
            error: `Greška pri optimizaciji slike ${image.name}: ${err?.message || "Nepoznata greška"}`
          }, { status: 400 });
        }
        
        // Upload na Cloudinary sa naprednim transformacijama
        const uploadPromise = new Promise<{ url: string, publicId: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'wedding-app', 
              resource_type: 'image',
              // Napredne Cloudinary transformacije za optimizaciju
              transformation: [
                { quality: "auto" }, // Automatski optimizira kvalitetu
                { fetch_format: "auto" }, // Automatski bira najbolji format (WebP za moderne browsere)
              ],
              // Dodajemo tag za lakše upravljanje slikama
              tags: ['wedding-app', 'guest-upload']
            },
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
              if (error || !result) return reject(error || new Error('Upload failed'));
              resolve({ 
                url: result.secure_url,
                publicId: result.public_id
              });
            }
          );
          stream.end(optimizedBuffer);
        });
        
        const { url: imageUrl, publicId } = await uploadPromise;
        
        // Upis slike i njenog URL-a u bazu, zajedno sa Cloudinary publicId-om
        const uploadedImage = await prisma.image.create({
          data: { 
            guestId, 
            imageUrl,
            storagePath: publicId // Koristimo storagePath polje za čuvanje Cloudinary publicId-a
          },
        });
        uploadedImages.push(uploadedImage);

      } catch (err: any) {
        console.error(`Greška pri uploadu slike:`, err);
        return NextResponse.json({ 
          error: `Greška pri uploadu slike: ${err?.message || "Nepoznata greška"}` 
        }, { status: 500 });
      }
    }

    // --- Upis/izmena poruke gosta u bazu (ako imamo i poruku i slike) ---
    if (message.trim() && images.length > 0) {
      await prisma.message.upsert({
        where: { guestId },
        update: { text: message },
        create: { guestId, text: message },
      });
    }

    return NextResponse.json({ 
      success: true, 
      images: uploadedImages.length,
      totalImages: currentImagesCount + uploadedImages.length
    });
  } catch (error) {
    console.error("Greška prilikom uploada:", error);
    return NextResponse.json({ error: "Došlo je do greške prilikom slanja" }, { status: 500 });
  }
}
