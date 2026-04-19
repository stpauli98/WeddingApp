import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPaymentDigestEmail } from '@/lib/email';
import { sendTelegramAlert } from '@/lib/telegram';

export const runtime = 'nodejs';

function safeCompareBearer(header: string, secret: string): boolean {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || '';
  if (!safeCompareBearer(auth, process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 86400000);
  const [total, invalid, errors, stuck] = await Promise.all([
    prisma.webhookLog.count({ where: { createdAt: { gt: since } } }),
    prisma.webhookLog.count({
      where: { signatureValid: false, createdAt: { gt: since } },
    }),
    prisma.webhookLog.count({
      where: { error: { not: null }, createdAt: { gt: since } },
    }),
    prisma.payment.count({
      where: {
        status: 'pending',
        createdAt: { lt: new Date(Date.now() - 2 * 3600 * 1000) },
      },
    }),
  ]);

  const signatureFailFlood = invalid > 10;
  if (signatureFailFlood) {
    await sendTelegramAlert(`⚠️ Webhook signature fail flood: ${invalid} in 24h`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      await sendPaymentDigestEmail({
        to: adminEmail,
        webhookTotal: total,
        webhookInvalid: invalid,
        webhookErrors: errors,
        stuckPending: stuck,
        signatureFailFlood,
      });
    } catch (err) {
      console.error('Payment digest email failed:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    webhookTotal: total,
    webhookInvalid: invalid,
    webhookErrors: errors,
    stuckPending: stuck,
  });
}
