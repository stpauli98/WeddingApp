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

  // Atomic check-and-delete: WHERE clause ensures concurrent activation blocks the delete.
  // payment.deleteMany is safe to run unconditionally — if the event was activated
  // between guard and now, the next event.deleteMany returns count=0 and we report 409.
  const eventId = admin.event.id;
  const [, eventDelete] = await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId } }),
    prisma.event.deleteMany({ where: { id: eventId, activatedAt: null } }),
  ]);

  if (eventDelete.count === 0) {
    // Event was activated between guard and delete — race lost; webhook wins.
    return NextResponse.json(
      { error: 'Plaćanje je u međuvremenu potvrđeno — event je sad aktivan.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
