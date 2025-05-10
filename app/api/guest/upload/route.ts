// Ograničenje veličine za upload (povećano od 10MB koji je moj trenutni max zbog Cloudinary free plana)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

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
import { getGuestById } from '@/lib/auth';
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
  try {
    // --- Validacija korisnika ---
    const url = new URL(request.url);
    const guestId: string | null = url.searchParams.get('guestId');
    if (!guestId) return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });

    // --- Parsiranje forme ---
    const formData = await request.formData();
    const images: File[] = formData.getAll("images").filter(Boolean) as File[];
    const message: string = (formData.get("message") as string | null) || "";

    // Dohvati gosta za provjeru
    const guest = await getGuestById(guestId);
    if (!guest) return NextResponse.json({ error: "Gost nije pronađen ili nije verifikovan" }, { status: 404 });
    
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
    if (images.length > 10) {
      return NextResponse.json({ error: "Možete poslati najviše 10 slika" }, { status: 400 });
    }

    // Provjeri ukupan broj slika (postojeće + nove)
    const currentImagesCount = await prisma.image.count({ where: { guestId } });
    if (currentImagesCount + images.length > 10) {
      return NextResponse.json({ 
        error: `Ukupno možete imati najviše 10 slika. Trenutno imate ${currentImagesCount}, a pokušavate dodati ${images.length} novih.` 
      }, { status: 400 });
    }

    // --- Upload slika na Cloudinary i upis u bazu ---
    const uploadedImages: any[] = [];
    // Maksimalna veličina slike (Cloudinary free plan: 10MB po slici)
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Obradi svaku sliku pojedinačno
    for (const image of images) {
      try {
        // Validacija tipa slike
        if (!image.type.startsWith('image/')) {
          return NextResponse.json({ error: `Fajl ${image.name} nije slika.` }, { status: 400 });
        }
        
        // Validacija veličine slike
        if (image.size > maxSize) {
          return NextResponse.json({ 
            error: `Slika ${image.name} je veća od 10MB. Molimo vas da smanjite rezoluciju ili veličinu slike.` 
          }, { status: 400 });
        }
        
        // Konvertuj u JPG radi optimizacije
        const buffer = Buffer.from(await image.arrayBuffer());
        let jpgBuffer: Buffer;
        try {
          jpgBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
        } catch (err: any) {
          return NextResponse.json({ 
            error: `Greška pri konverziji slike ${image.name} u JPG: ${err?.message || "Nepoznata greška"}` 
          }, { status: 400 });
        }
        
        // Upload na Cloudinary (koristi upload_stream zbog velikih fajlova)
        const uploadPromise = new Promise<{ url: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'wedding-app', resource_type: 'image' },
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
              if (error || !result) return reject(error || new Error('Upload failed'));
              resolve({ url: result.secure_url });
            }
          );
          stream.end(jpgBuffer);
        });
        
        const { url: imageUrl } = await uploadPromise;
        
        // Upis slike i njenog URL-a u bazu
        const uploadedImage = await prisma.image.create({
          data: { guestId, imageUrl },
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
