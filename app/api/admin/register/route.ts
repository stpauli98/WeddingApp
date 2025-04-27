import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 });
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
