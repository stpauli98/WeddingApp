import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getGuestById } from '@/lib/auth';

/**
 * API ruta za dohvatanje broja slika koje je gost uploadovao
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const guestId = url.searchParams.get('guestId');

    if (!guestId) {
      return NextResponse.json({ error: "Nedostaje ID gosta" }, { status: 400 });
    }

    // Provjeri da li gost postoji
    const guest = await getGuestById(guestId);
    if (!guest) {
      return NextResponse.json({ error: "Gost nije pronađen" }, { status: 404 });
    }

    // Dohvati broj slika za gosta
    const count = await prisma.image.count({
      where: { guestId }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Greška pri dohvatanju broja slika:", error);
    return NextResponse.json({ error: "Došlo je do greške pri dohvatanju broja slika" }, { status: 500 });
  }
}
