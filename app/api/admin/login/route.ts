import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';

const prisma = new PrismaClient();

export async function GET() {
  // Generiši i pošalji CSRF token
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set('set-cookie', cookie);
  return response;
}

export async function POST(req: NextRequest) {
  // Provera CSRF tokena
  const csrfToken = req.headers.get('x-csrf-token') || req.cookies.get('csrf_token')?.value || '';
  const validCsrf = await validateCsrfToken(csrfToken);
  if (!validCsrf) {
    return NextResponse.json({ error: 'Nevažeći CSRF token.' }, { status: 403 });
  }
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 });
    }
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ error: 'Neispravan email ili lozinka.' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Neispravan email ili lozinka.' }, { status: 401 });
    }
    // Generiši session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dana
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        expiresAt,
      },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dana
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
