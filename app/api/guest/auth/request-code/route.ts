// app/api/guest/auth/request-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { firstName, lastName, email } = await req.json();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  // Pronađi prvi event u bazi (privremeno rešenje)
  const event = await prisma.event.findFirst();
  if (!event) {
    return NextResponse.json({ error: "Nijedan događaj ne postoji u bazi" }, { status: 500 });
  }
  // Upsert korisnika
  try {
    await prisma.guest.upsert({
      where: { email },
      update: { firstName, lastName, code, codeExpires, verified: false },
      create: { eventId: event.id, firstName, lastName, email, code, codeExpires },
    });
    console.log('Upis u bazu OK');
  } catch (e) {
    console.error('GRESKA PRI UPISU U BAZU:', e);
  }

  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}