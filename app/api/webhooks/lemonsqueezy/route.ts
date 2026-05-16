import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy/signature';
import { getRequestIp } from '@/lib/security/request-ip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting webhook');
    return NextResponse.json({ error: 'webhook misconfigured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const signatureValid = verifyLemonSqueezySignature(rawBody, signature, secret);

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Non-JSON body is logged below but we don't crash.
  }

  const lsEventId = payload?.meta?.event_id ? String(payload.meta.event_id) : null;
  const eventName = payload?.meta?.event_name ? String(payload.meta.event_name) : null;
  const sourceIp = getRequestIp(req);

  // Always log every webhook attempt for audit, even when signature fails.
  await prisma.webhookLog.create({
    data: {
      lsEventId,
      eventName,
      signatureValid,
      payload: payload ?? { raw: rawBody.slice(0, 1000) },
      sourceIp,
      processedAt: null,
    },
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // Idempotency: if we've already processed this LS event, return 200 no-op.
  if (lsEventId) {
    const existing = await prisma.payment.findUnique({ where: { lsEventId } });
    if (existing && existing.status !== 'pending') {
      return NextResponse.json({ ok: true, idempotent: true });
    }
  }

  // Dispatch logic added in subsequent tasks (3.3+).
  return NextResponse.json({ ok: true });
}
