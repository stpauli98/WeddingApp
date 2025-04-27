import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Dohvati session token iz cookie-ja
    const cookieStore = await req.cookies;
    const sessionToken = cookieStore.get('admin_session')?.value;

    // Obriši session iz baze (opciono, za dodatnu sigurnost)
    if (sessionToken) {
      await prisma.adminSession.deleteMany({ where: { sessionToken } });
    }

    // Obriši cookie na klijentu
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
