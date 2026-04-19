import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payments = await prisma.payment.findMany({
    where: { eventId: admin.event.id },
    select: {
      id: true,
      tier: true,
      amountCents: true,
      refundedAmountCents: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ payments });
}
