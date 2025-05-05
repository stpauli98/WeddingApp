import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';

const prisma = new PrismaClient();

export async function GET() {
  // Generiši i pošalji CSRF token
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set("csrf_token_admin_register", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minuta
    path: "/"
  });
  return response;
}

export async function POST(req: NextRequest) {
  // Provera CSRF tokena
  const csrfToken = req.headers.get('x-csrf-token') || req.cookies.get('csrf_token_admin_register')?.value || '';
  const validCsrf = await validateCsrfToken(csrfToken);
  if (!validCsrf) {
    return NextResponse.json({ error: 'Nevažeći CSRF token.' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { email, password, firstName, lastName } = body;
    // Validacija polja
    function isValidEmail(email: string) {
      return /^\S+@\S+\.\S+$/.test(email);
    }
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Sva polja su obavezna.' }, { status: 400 });
    }
    if (!isValidEmail(email) || email.length > 100) {
      return NextResponse.json({ error: 'Neispravan format email adrese ili predugačak email.' }, { status: 400 });
    }
    if (firstName.length < 2 || firstName.length > 32) {
      return NextResponse.json({ error: 'Ime mora imati između 2 i 32 znaka.' }, { status: 400 });
    }
    if (lastName.length < 2 || lastName.length > 32) {
      return NextResponse.json({ error: 'Prezime mora imati između 2 i 32 znaka.' }, { status: 400 });
    }
    if (password.length < 6 || password.length > 64) {
      return NextResponse.json({ error: 'Lozinka mora imati između 6 i 64 znaka.' }, { status: 400 });
    }
    // Proveri da li admin već postoji
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Admin sa tim emailom već postoji.' }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
    });

    // Automatski kreiraj session i postavi cookie (kao na loginu)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dana
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        expiresAt,
      },
    });

    const response = NextResponse.json({ success: true, admin: { id: admin.id, email: admin.email } });
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dana
    });
    return response;
  } catch (e: any) {
    console.error("Admin register error:", e?.message, e?.stack, e);
    return NextResponse.json({ error: e?.message || 'Greška na serveru.' }, { status: 500 });
  }
}
