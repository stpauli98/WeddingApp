// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
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

  const response = NextResponse.json({ ok: true });
  response.cookies.set('guest', email, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
  return response;
}