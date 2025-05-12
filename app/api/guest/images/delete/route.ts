import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import crypto from 'crypto';
import { cookies } from 'next/headers';
import cloudinary from '@/lib/cloudinary';

// Definisanje tipa za sliku

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_delete', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30, // 30 minuta
    path: '/'
  });
  return response;
}

interface Image {
  id: string
  guestId: string
  imageUrl: string
  createdAt: Date
  storagePath?: string // Cloudinary public ID
}

export async function DELETE(request: Request) {
  // CSRF zaštita
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_delete')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo.' }, { status: 403 });
  }
  try {
    // Dobavi parametre iz URL-a (guestId za autentifikaciju i imageId za brisanje)
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const imageId = searchParams.get('id');
    
    if (!guestId) {
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

    // Ako slika ima storagePath (Cloudinary public ID), obriši je iz Cloudinary-a
    if (image.storagePath) {
      try {
        // Obriši sliku iz Cloudinary-a
        await new Promise<void>((resolve, reject) => {
          cloudinary.uploader.destroy(image.storagePath!, (error, result) => {
            if (error) {
              console.error(`Greška pri brisanju slike iz Cloudinary-a: ${error}`);
              // Ne prekidamo proces ako ne uspijemo obrisati sliku iz Cloudinary-a
            }
            resolve();
          });
        });
      } catch (cloudinaryError) {
        console.error(`Greška pri brisanju slike iz Cloudinary-a: ${cloudinaryError}`);
        // Nastavljamo sa brisanjem iz baze čak i ako ne uspijemo obrisati iz Cloudinary-a
      }
    }

    // Obriši sliku iz baze
    await prisma.image.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Došlo je do greške prilikom brisanja slike" }, { status: 500 });
  }
}
