import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';

export async function GET(request: NextRequest) {
  try {
    const guest = await getAuthenticatedGuest();
    if (!guest) {
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
    }

    const count = await prisma.image.count({
      where: { guestId: guest.id }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Greška pri dohvatanju broja slika:", error);
    return NextResponse.json({ error: "Došlo je do greške" }, { status: 500 });
  }
}
