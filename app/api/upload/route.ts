import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from '@/lib/prisma'
import { generateUniqueId } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    // Proveri autentifikaciju (cookie auth -> guestId)
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth");
    if (!authCookie || !authCookie.value) {
      console.log("[UPLOAD] Nema auth cookie-a");
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
    }
    const guestId = authCookie.value;

    // Pročitaj formu
    const formData = await request.formData();
    console.log("[UPLOAD] FormData ključevi:", [...formData.keys()]);
    
    const images = formData.getAll("images").filter(Boolean) as File[];
    console.log(`[UPLOAD] Primljeno slika: ${images.length}`);
    if (images.length > 0) {
      console.log(`[UPLOAD] Prva slika tip: ${images[0].type}, veličina: ${images[0].size} bajtova`);
    }
    
    const message = (formData.get("message") as string | null) || "";
    console.log(`[UPLOAD] Primljena poruka (${message.length} karaktera): "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    

    // Validacija broja slika
    if (images.length > 10) {
      return NextResponse.json({ error: "Možete poslati najviše 10 slika" }, { status: 400 });
    }

    // Pronađi gosta
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, include: { images: true } });
    if (!guest) {
      console.log(`[UPLOAD] Gost nije pronađen za ID: ${guestId}`);
      return NextResponse.json({ error: "Gost nije pronađen" }, { status: 404 });
    }

    // Validacija ukupnog broja slika
    if ((guest.images?.length || 0) + images.length > 10) {
      return NextResponse.json({ error: "Ukupno možete imati najviše 10 slika" }, { status: 400 });
    }

    // Upis slika (konvertovanje u base64)
    const uploadedImages = [];
    for (const image of images) {
      try {
        // Konvertuj sliku u base64 string
        const buffer = await image.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = image.type || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        // Sačuvaj URL u bazi
        const uploadedImage = await prisma.image.create({
          data: {
            guestId,
            imageUrl: dataUrl,
          },
        });
        uploadedImages.push(uploadedImage);
      } catch (error) {
        console.error(`[UPLOAD] Greška pri obradi slike: ${error}`);
      }
    }
    console.log(`[UPLOAD] Upisano slika: ${uploadedImages.length}`);

    // Upis poruke (čestitke)
    if (message.trim().length > 0) {
      await prisma.message.upsert({
        where: { guestId },
        update: { text: message },
        create: { guestId, text: message },
      });
      console.log(`[UPLOAD] Poruka upisana za gosta ${guestId}`);
    }

    return NextResponse.json({ success: true, images: uploadedImages.length });
  } catch (error) {
    console.error("[UPLOAD ERROR]", error);
    return NextResponse.json({ error: "Došlo je do greške prilikom slanja" }, { status: 500 });
  }
}

