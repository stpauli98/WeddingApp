import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

// Konstanta za ime bucket-a
const BUCKET_NAME = 'wedding-images'

// Definisanje tipa za sliku sa storagePath poljem
interface Image {
  id: string
  guestId: string
  imageUrl: string
  storagePath?: string
  createdAt: Date
}

export async function DELETE(request: Request) {
  try {
    // Dobavi parametre iz URL-a (guestId za autentifikaciju i imageId za brisanje)
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const imageId = searchParams.get('id');
    
    if (!guestId) {
      console.log("[DELETE-IMAGE] Nedostaje guestId u parametrima");
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
    }

    if (!imageId) {
      return NextResponse.json({ error: "ID slike nije naveden" }, { status: 400 });
    }

    // Pronađi sliku i proveri da li pripada trenutnom gostu
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    }) as Image | null;

    if (!image) {
      return NextResponse.json({ error: "Slika nije pronađena" }, { status: 404 });
    }

    if (image.guestId !== guestId) {
      return NextResponse.json({ error: "Nemate dozvolu za brisanje ove slike" }, { status: 403 });
    }

    // Ako slika ima storagePath, obriši je iz Supabase Storage-a
    if (image.storagePath) {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([image.storagePath]);
      
      if (error) {
        console.error(`[DELETE-IMAGE] Greška pri brisanju iz Supabase: ${JSON.stringify(error)}`);
        // Nastavljamo sa brisanjem iz baze čak i ako je brisanje iz Storage-a neuspešno
      } else {
        console.log(`[DELETE-IMAGE] Slika uspešno obrisana iz Supabase Storage: ${image.storagePath}`);
      }
    }
    
    // Obriši sliku iz baze
    await prisma.image.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE-IMAGE ERROR]", error);
    return NextResponse.json({ error: "Došlo je do greške prilikom brisanja slike" }, { status: 500 });
  }
}
