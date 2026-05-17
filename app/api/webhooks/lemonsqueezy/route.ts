import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy/signature';
import { getRequestIp } from '@/lib/security/request-ip';
import { createRateLimiter } from '@/lib/security/rate-limit';
import { normalizeWebhook, handleInitialPurchase, handleUpgrade, handleRetentionExtension, handleRefund } from '@/lib/lemonsqueezy/handlers';

// LS legitimate webhooks: <1/sec. 60/min cap blocks flood-style abuse.
const webhookLimiter = createRateLimiter({ name: 'ls-webhook', max: 60, windowMs: 60 * 1000 });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting webhook');
    return NextResponse.json({ error: 'webhook misconfigured' }, { status: 500 });
  }

  const ip = getRequestIp(req);
  const rl = await webhookLimiter.check(ip);
  if (!rl.success) {
    // Don't log to DB — that's the DoS surface we're protecting against.
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
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
  const lsEventId = payload?.meta?.webhook_id ? String(payload.meta.webhook_id).slice(0, 255) : null;
  const eventName = payload?.meta?.event_name ? String(payload.meta.event_name).slice(0, 255) : null;
  const sourceIp = getRequestIp(req);

  if (!signatureValid) {
    // Don't persist to DB — protects against unsigned-traffic flood.
    // Console log is ephemeral but sufficient for forensic noise.
    console.warn(`[lemonsqueezy] invalid signature from ${sourceIp} for event=${eventName ?? 'unknown'}`);
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // Only authenticated webhooks get persisted to WebhookLog.
  const logRow = await prisma.webhookLog.create({
    data: {
      lsEventId,
      eventName,
      signatureValid: true,
      payload: payload ?? { raw: rawBody.slice(0, 1000) },
      sourceIp,
      processedAt: null,
    },
  });

  // Idempotency: if any Payment exists for this lsEventId, the webhook was
  // already processed. After Group A removed orphan pending rows, we never
  // create pending Payments at the route level, so any row here means the
  // handler's upsert ran. Treat ALL existing rows as already-handled.
  if (lsEventId) {
    const existing = await prisma.payment.findUnique({ where: { lsEventId } });
    if (existing) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
  }

  const normalized = normalizeWebhook(payload);
  if (!normalized) {
    // Unknown / unrelated event type — log + ack so LS stops retrying.
    await prisma.webhookLog.update({
      where: { id: logRow.id },
      data: { processedAt: new Date(), error: 'unhandled event type' },
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (normalized.eventName === 'order_created') {
      if (normalized.custom.purpose === 'initial_purchase') {
        await handleInitialPurchase(normalized);
      } else if (normalized.custom.purpose === 'upgrade') {
        await handleUpgrade(normalized);
      } else if (normalized.custom.purpose === 'retention_extension') {
        await handleRetentionExtension(normalized);
      }
    } else if (normalized.eventName === 'order_refunded') {
      await handleRefund(normalized);
    }
  } catch (err) {
    console.error('LS webhook handler error:', err);
    await prisma.webhookLog.update({
      where: { id: logRow.id },
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  await prisma.webhookLog.update({
    where: { id: logRow.id },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
