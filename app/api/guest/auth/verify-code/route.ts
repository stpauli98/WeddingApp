// app/api/guest/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_verify', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30, // 30 minuta
    path: '/'
  });
  return response;
}


export async function POST(req: NextRequest) {
  // CSRF zaštita
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_verify')?.value;
  const csrfHeader = req.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo.' }, { status: 403 });
  }
  const { email, code } = await req.json();
  const guest = await prisma.guest.findUnique({ where: { email } });

  if (
    !guest ||
    guest.code !== code ||
    !guest.codeExpires ||
    guest.codeExpires < new Date()
  ) {
    return NextResponse.json({ error: 'Neispravan ili istekao kod.' }, { status: 400 });
  }

  await prisma.guest.update({
    where: { email },
    data: { verified: true, code: null, codeExpires: null },
  });

  return NextResponse.json({ 
    ok: true,
    guestId: guest.id
  });
}