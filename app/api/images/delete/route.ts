import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    // Proveri autentifikaciju (cookie auth -> guestId)
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth");
    if (!authCookie || !authCookie.value) {
      console.log("[DELETE-IMAGE] Nema auth cookie-a");
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
    }
    const guestId = authCookie.value;

    // Dobavi ID slike iz URL-a
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    
    if (!imageId) {
      return NextResponse.json({ error: "ID slike nije naveden" }, { status: 400 });
    }

    // Pronađi sliku i proveri da li pripada trenutnom gostu
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: "Slika nije pronađena" }, { status: 404 });
    }

    if (image.guestId !== guestId) {
      return NextResponse.json({ error: "Nemate dozvolu za brisanje ove slike" }, { status: 403 });
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
