import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'invalid csrf' }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'no event' }, { status: 404 });
  }
  if (admin.event.activatedAt) {
    return NextResponse.json({ error: 'cannot cancel active event' }, { status: 409 });
  }

  const eventId = admin.event.id;
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId, status: 'pending' } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);

  return NextResponse.json({ ok: true });
}
