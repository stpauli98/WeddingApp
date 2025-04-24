import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getGuestById } from '@/lib/auth';
import sharp from 'sharp';

const BUCKET_NAME = 'wedding-images';

type UploadResult = { success: boolean; images: number } | { error: string };

/**
 * Upload više slika u Supabase bucket (samo slike!) i poruku gosta u bazu.
 * Poruka NIKAD ne ide u bucket, slike NIKAD ne idu u message tabelu.
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    // --- Validacija korisnika ---
    const url = new URL(request.url);
    const guestId: string | null = url.searchParams.get('guestId');
    if (!guestId) return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });

    // --- Parsiranje forme ---
    const formData = await request.formData();
    const images: File[] = formData.getAll("images").filter(Boolean) as File[];
    const message: string = (formData.get("message") as string | null) || "";

    // --- Validacija broja slika ---
    if (images.length > 10)
      return NextResponse.json({ error: "Možete poslati najviše 10 slika" }, { status: 400 });

    const guest = await getGuestById(guestId);
    if (!guest) return NextResponse.json({ error: "Gost nije pronađen ili nije verifikovan" }, { status: 404 });
    if ((guest.images?.length || 0) + images.length > 10)
      return NextResponse.json({ error: "Ukupno možete imati najviše 10 slika" }, { status: 400 });

    // --- Upload slika u Supabase bucket i upis u bazu ---
    const uploadedImages: any[] = [];
    // Maksimalna veličina slike
    const maxSize = 5 * 1024 * 1024; // 5MB
    for (const image of images) {
      try {
        // Dozvoli samo fajlove koji su slike
        if (!image.type.startsWith('image/')) {
          return NextResponse.json({ error: `Fajl ${image.name} nije slika.` }, { status: 400 });
        }
        if (image.size > maxSize) {
          return NextResponse.json({ error: `Slika ${image.name} je veća od 5MB. Molimo vas da smanjite rezoluciju ili veličinu slike.` }, { status: 400 });
        }
        const fileName = `${guestId}_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const filePath = `${guestId}/${fileName}`;
        const buffer = Buffer.from(await image.arrayBuffer());
        // Konvertuj bilo koji format u JPG koristeći sharp
        let jpgBuffer: Buffer;
        try {
          jpgBuffer = await sharp(buffer).rotate().jpeg({ quality: 85 }).toBuffer();
        } catch (err: any) {
          return NextResponse.json({ error: `Greška pri konverziji slike ${image.name} u JPG: ${err?.message || "Nepoznata greška"}` }, { status: 400 });
        }
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, jpgBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
        if (error) {
          return NextResponse.json({ error: `Greška pri uploadu slike ${image.name}: ${error.message || error}` }, { status: 500 });
        }
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        const imageUrl = data.publicUrl;
        // Upis slike i njenog URL-a u bazu
        const uploadedImage = await prisma.image.create({
          data: { guestId, imageUrl, storagePath: filePath } as any,
        });
        uploadedImages.push(uploadedImage);
      } catch (err: any) {
        return NextResponse.json({ error: `Greška pri uploadu slike: ${err?.message || "Nepoznata greška"}` }, { status: 500 });
      }
    }

    // --- Upis/izmena poruke gosta u bazu (nikad u bucket) ---
    if (message.trim()) {
      await prisma.message.upsert({
        where: { guestId },
        update: { text: message },
        create: { guestId, text: message },
      });
    }

    return NextResponse.json({ success: true, images: uploadedImages.length });
  } catch {
    return NextResponse.json({ error: "Došlo je do greške prilikom slanja" }, { status: 500 });
  }
}
