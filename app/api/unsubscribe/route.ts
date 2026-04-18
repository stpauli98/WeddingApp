// Public, token-based unsubscribe — no auth required.
// Token is generated at marketing-harvest time and embedded in outbound emails.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TOKEN_LENGTH = 48; // 24 bytes → 48 hex chars

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (token.length !== TOKEN_LENGTH || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json({ ok: false, reason: 'invalid token' }, { status: 400 });
  }

  const updated = await prisma.marketingContact.updateMany({
    where: { unsubscribeToken: token, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });

  if (updated.count === 0) {
    // Token not found OR already unsubscribed — indistinguishable on purpose.
    return NextResponse.json({ ok: false, reason: 'already unsubscribed or invalid' });
  }
  return NextResponse.json({ ok: true });
}
