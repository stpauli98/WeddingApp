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
  // Reject implausibly large bodies before any further processing.
  // LemonSqueezy webhook payloads are < 10 KB in practice; 64 KB is a generous cap.
  if (rawBody.length > 65536) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }
  const signature = req.headers.get('x-signature') || '';
  const signatureValid = verifyLemonSqueezySignature(rawBody, signature, secret);

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Non-JSON body is logged below but we don't crash.
  }

  // Cap extracted strings before DB write to prevent oversized log rows
  // (payload values come from untrusted body before signature verification).
  const lsEventId = payload?.meta?.event_id ? String(payload.meta.event_id).slice(0, 255) : null;
  const eventName = payload?.meta?.event_name ? String(payload.meta.event_name).slice(0, 255) : null;
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
