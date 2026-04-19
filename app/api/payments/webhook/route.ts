import { NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/lemon-squeezy';
import { scrubPayload } from '@/lib/webhook-scrub';
import { getEffectiveTier } from '@/lib/entitlement';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import { sendTelegramAlert } from '@/lib/telegram';

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const secret = process.env.LS_WEBHOOK_SECRET || '';

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    await prisma.webhookLog.create({
      data: {
        signatureValid: false,
        payload: safeParse(rawBody) as object,
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
  }

  const meta = ((event as { meta?: Record<string, unknown> }).meta || {}) as Record<string, unknown>;
  const data = ((event as { data?: Record<string, unknown> }).data || {}) as Record<string, unknown>;
  const attrs = ((data.attributes as Record<string, unknown>) || {}) as Record<string, unknown>;
  const eventName = String(meta.event_name || '');
  const lsEventId = String(meta.event_id || '');

  // test_mode guard in production
  if (process.env.NODE_ENV === 'production' && meta.test_mode === true) {
    await prisma.webhookLog.create({
      data: {
        lsEventId: lsEventId || null,
        eventName,
        signatureValid: true,
        payload: scrubPayload(event) as object,
        error: 'test_mode webhook in production',
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'test_mode rejected in production' }, { status: 400 });
  }

  // Store ID allowlist
  if (attrs.store_id && String(attrs.store_id) !== String(process.env.LS_STORE_ID)) {
    await prisma.webhookLog.create({
      data: {
        lsEventId: lsEventId || null,
        eventName,
        signatureValid: true,
        payload: scrubPayload(event) as object,
        error: `wrong store_id: ${attrs.store_id}`,
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'Wrong store' }, { status: 400 });
  }

  // Variant ID allowlist for order events
  const variantId = (attrs.first_order_item as { variant_id?: unknown })?.variant_id;
  if (
    (eventName === 'order_created' || eventName === 'order_refunded') &&
    variantId !== undefined
  ) {
    const plans = await prisma.pricingPlan.findMany({
      select: { lsVariantId: true },
    });
    const allowed = new Set(
      (plans as Array<{ lsVariantId: string | null }>)
        .map((p) => p.lsVariantId)
        .filter((v): v is string => v !== null)
    );
    if (!allowed.has(String(variantId))) {
      await sendTelegramAlert(`⚠️ Unknown variant_id in webhook: ${variantId}`);
      await prisma.webhookLog.create({
        data: {
          lsEventId: lsEventId || null,
          eventName,
          signatureValid: true,
          payload: scrubPayload(event) as object,
          error: `unknown variant_id: ${variantId}`,
          sourceIp,
        },
      });
      return NextResponse.json({ error: 'Unknown variant' }, { status: 400 });
    }
  }

  // Idempotency: upsert by lsEventId (UNIQUE). Duplicate retry = no-op.
  await prisma.webhookLog.upsert({
    where: { lsEventId },
    create: {
      lsEventId,
      eventName,
      signatureValid: true,
      payload: scrubPayload(event) as object,
      sourceIp,
    },
    update: {}, // no-op — already processed
  });

  try {
    switch (eventName) {
      case 'order_created':
        await handleOrderCreated(event);
        break;
      case 'order_refunded':
        await handleOrderRefunded(event);
        break;
      default:
        await prisma.webhookLog.update({
          where: { lsEventId },
          data: { eventName: `unknown:${eventName}` },
        });
    }

    await prisma.webhookLog.update({
      where: { lsEventId },
      data: { processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.webhookLog.update({
      where: { lsEventId },
      data: { error: message, processedAt: new Date() },
    });
    // Return 200 so LS doesn't retry forever; reprocess script handles.
    return NextResponse.json({ ok: false, logged: true });
  }
}

async function handleOrderCreated(event: Record<string, unknown>): Promise<void> {
  const meta = (event.meta as Record<string, unknown>) || {};
  const data = (event.data as Record<string, unknown>) || {};
  const customData =
    (meta.custom_data as {
      eventId: string;
      checkoutInternalId: string;
    }) || ({ eventId: '', checkoutInternalId: '' });
  const { eventId, checkoutInternalId } = customData;
  const orderId = String(data.id);
  const lsEventId = String(meta.event_id);

  await prisma.$transaction(
    async (tx: TxClient) => {
      await tx.payment.update({
        where: { lsCheckoutId: checkoutInternalId },
        data: {
          status: 'paid',
          lsOrderId: orderId,
          lsEventId,
        },
      });
      const effective = await getEffectiveTier(eventId);
      const plan = await tx.pricingPlan.findUnique({
        where: { tier: effective },
        select: { imageLimit: true },
      });
      await tx.event.update({
        where: { id: eventId },
        data: {
          pricingTier: effective,
          imageLimit: plan?.imageLimit ?? PRICING_TIERS[effective].imageLimit,
        },
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

async function handleOrderRefunded(event: Record<string, unknown>): Promise<void> {
  const meta = (event.meta as Record<string, unknown>) || {};
  const data = (event.data as Record<string, unknown>) || {};
  const attrs = (data.attributes as Record<string, unknown>) || {};
  const customData =
    (meta.custom_data as {
      eventId: string;
      targetTier: string;
      checkoutInternalId: string;
    }) || ({ eventId: '', targetTier: 'free', checkoutInternalId: '' });
  const { eventId, targetTier, checkoutInternalId } = customData;
  const orderId = String(data.id);
  const refundedAmount = Number(attrs.refunded_amount ?? 0);
  const total = Number(attrs.total ?? 0);
  const lsEventId = String(meta.event_id);

  await prisma.$transaction(
    async (tx: TxClient) => {
      // H3: upsert handles out-of-order (refund before order_created)
      await tx.payment.upsert({
        where: { lsOrderId: orderId },
        update: {
          refundedAmountCents: { increment: refundedAmount },
          refundedAt: new Date(),
          status: refundedAmount >= total ? 'refunded' : 'partial',
          lsEventId,
        },
        create: {
          eventId,
          tier: targetTier as PricingTier,
          amountCents: total,
          refundedAmountCents: refundedAmount,
          refundedAt: new Date(),
          status: refundedAmount >= total ? 'refunded' : 'partial',
          lsOrderId: orderId,
          lsEventId,
          lsCheckoutId: checkoutInternalId || `refund-placeholder-${orderId}`,
          customerEmail: String(attrs.customer_email ?? 'unknown@unknown'),
        },
      });

      const effective = await getEffectiveTier(eventId);
      const plan = await tx.pricingPlan.findUnique({
        where: { tier: effective },
        select: { imageLimit: true },
      });
      await tx.event.update({
        where: { id: eventId },
        data: {
          pricingTier: effective,
          imageLimit: plan?.imageLimit ?? PRICING_TIERS[effective].imageLimit,
        },
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { _rawUnparseable: raw.slice(0, 500) };
  }
}
