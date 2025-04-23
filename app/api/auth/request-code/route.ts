// app/api/auth/request-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { first_name, last_name, email } = await req.json();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const code_expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  // Upsert korisnika
  await prisma.guest.upsert({
    where: { email },
    update: { first_name, last_name, code, code_expires_at, verified: false },
    create: { first_name, last_name, email, code, code_expires_at },
  });

  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}