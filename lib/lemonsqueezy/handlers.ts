import { prisma } from '@/lib/prisma';
import type { PaymentPurpose } from '@prisma/client';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';

export interface NormalizedWebhook {
  lsEventId: string;
  lsOrderId: string;
  eventName: 'order_created' | 'order_refunded';
  customerEmail: string;
  amountCents: number;
  currency: string;
  custom: { eventId: string; adminId: string; purpose: PaymentPurpose; toTier?: PricingTier };
}

const RETENTION_DAYS_PER_PURCHASE = 30;
const RETENTION_MAX_OVERRIDE_DAYS = 365;

export function normalizeWebhook(payload: any): NormalizedWebhook | null {
  const eventName = payload?.meta?.event_name;
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return null;

  // LS uses meta.webhook_id (UUID) as the per-delivery unique ID — NOT meta.event_id.
  const lsEventId = payload?.meta?.webhook_id;
  const lsOrderId = payload?.data?.id;
  // LS normalizes custom_data keys to snake_case (we send camelCase, LS echoes snake_case).
  const custom = payload?.meta?.custom_data;
  const attrs = payload?.data?.attributes;

  const eventId = custom?.event_id;
  const adminId = custom?.admin_id;
  const purpose = custom?.purpose;
  const validPurposes = ['initial_purchase', 'upgrade', 'retention_extension'] as const;
  if (!lsEventId || !lsOrderId || !eventId || !adminId || !purpose || !attrs) {
    return null;
  }
  if (!(validPurposes as readonly string[]).includes(purpose)) {
    return null;
  }
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return null;

  // For upgrade, to_tier must be present and a valid paid tier.
  let toTier: PricingTier | undefined;
  if (purpose === 'upgrade') {
    const raw = custom.to_tier;
    if (eventName === 'order_created') {
      if (raw !== 'basic' && raw !== 'premium') return null;
      toTier = raw;
    } else if (raw === 'basic' || raw === 'premium') {
      toTier = raw;
    }
  }

  return {
    lsEventId: String(lsEventId),
    lsOrderId: String(lsOrderId),
    eventName,
    customerEmail: String(attrs.user_email ?? ''),
    amountCents: Number(attrs.total) || 0,
    currency: String(attrs.currency ?? 'EUR'),
    custom: {
      eventId: String(eventId),
      adminId: String(adminId),
      purpose: purpose as PaymentPurpose,
      toTier,
    },
  };
}

export async function handleInitialPurchase(w: NormalizedWebhook): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true },
  });
  if (!event) {
    console.warn(`[lemonsqueezy] Event ${w.custom.eventId} not found — likely cancelled. Webhook ignored.`);
    return;
  }
  if (event.pricingTier === 'free') throw new Error('free tier should never reach this handler');

  const upsertOp = prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: event.pricingTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'initial_purchase',
      lsCheckoutId: w.lsOrderId,
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      updatedAt: new Date(),
    },
    update: {
      status: 'paid',
      lsOrderId: w.lsOrderId,
      updatedAt: new Date(),
    },
  });

  const eventOp = prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      activatedAt: new Date(),
      pendingPaymentExpiresAt: null,
    },
  });

  await prisma.$transaction([upsertOp, eventOp]);
}

export async function handleUpgrade(w: NormalizedWebhook): Promise<void> {
  const toTier = w.custom.toTier;
  if (!toTier) throw new Error('upgrade webhook missing toTier');

  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, imageLimit: true },
  });
  if (!event) {
    console.warn(`[lemonsqueezy] Event ${w.custom.eventId} not found — likely cancelled. Webhook ignored.`);
    return;
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { tier: toTier },
    select: { imageLimit: true },
  });
  const newImageLimit = plan?.imageLimit ?? PRICING_TIERS[toTier].imageLimit;

  const upsertOp = prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: toTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'upgrade',
      lsCheckoutId: w.lsOrderId,
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      metadata: {
        previousTier: event.pricingTier,
        previousImageLimit: event.imageLimit,
        toTier,
      },
      updatedAt: new Date(),
    },
    update: { status: 'paid', updatedAt: new Date() },
  });

  const eventOp = prisma.event.update({
    where: { id: w.custom.eventId },
    data: { pricingTier: toTier, imageLimit: newImageLimit },
  });

  await prisma.$transaction([upsertOp, eventOp]);
}

export async function handleRetentionExtension(w: NormalizedWebhook): Promise<void> {
  // Race-safe: bail early if a concurrent invocation already processed this lsEventId.
  const existing = await prisma.payment.findUnique({
    where: { lsEventId: w.lsEventId },
    select: { status: true },
  });
  if (existing && existing.status === 'paid') {
    // Already processed by a parallel webhook delivery; the upsert below would be
    // idempotent but the event.update would double-apply +30 days. Skip entirely.
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, retentionOverrideDays: true },
  });
  if (!event) {
    console.warn(`[lemonsqueezy] Event ${w.custom.eventId} not found — likely cancelled. Webhook ignored.`);
    return;
  }
  if (event.pricingTier === 'free') throw new Error('free tier cannot have retention extension');

  const newOverride = Math.min(
    event.retentionOverrideDays + RETENTION_DAYS_PER_PURCHASE,
    RETENTION_MAX_OVERRIDE_DAYS
  );

  const upsertOp = prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: event.pricingTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'retention_extension',
      lsCheckoutId: w.lsOrderId,
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      retentionDaysGranted: RETENTION_DAYS_PER_PURCHASE,
      updatedAt: new Date(),
    },
    update: { status: 'paid', updatedAt: new Date() },
  });

  const eventOp = prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      retentionOverrideDays: newOverride,
      deletionWarningSentAt: null,
    },
  });

  await prisma.$transaction([upsertOp, eventOp]);
}

export async function handleRefund(w: NormalizedWebhook): Promise<void> {
  // lsOrderId is not @unique in schema. Scope query by eventId + status to disambiguate.
  const payment = await prisma.payment.findFirst({
    where: {
      lsOrderId: w.lsOrderId,
      eventId: w.custom.eventId,
      status: 'paid',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, purpose: true, eventId: true, retentionDaysGranted: true, metadata: true },
  });
  if (!payment) {
    console.warn(`Refund webhook for unknown/already-refunded order ${w.lsOrderId} on event ${w.custom.eventId}`);
    return;
  }

  const paymentUpdateOp = prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'refunded',
      refundedAmountCents: w.amountCents,
      refundedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (payment.purpose === 'initial_purchase') {
    const eventUpdateOp = prisma.event.update({
      where: { id: payment.eventId },
      data: { activatedAt: null },
    });
    await prisma.$transaction([paymentUpdateOp, eventUpdateOp]);
  } else if (payment.purpose === 'upgrade') {
    const meta = (payment.metadata as any) || {};
    const validTiers: PricingTier[] = ['free', 'basic', 'premium', 'unlimited'];
    if (
      validTiers.includes(meta.previousTier) &&
      typeof meta.previousImageLimit === 'number' &&
      meta.previousImageLimit >= 0
    ) {
      const eventUpdateOp = prisma.event.update({
        where: { id: payment.eventId },
        data: {
          pricingTier: meta.previousTier,
          imageLimit: meta.previousImageLimit,
        },
      });
      await prisma.$transaction([paymentUpdateOp, eventUpdateOp]);
    } else {
      console.error(`Refund cannot revert upgrade for payment ${payment.id}: invalid metadata`, meta);
      await paymentUpdateOp;
    }
  } else if (payment.purpose === 'retention_extension') {
    const days = payment.retentionDaysGranted ?? 0;
    const event = await prisma.event.findUnique({
      where: { id: payment.eventId },
      select: { retentionOverrideDays: true },
    });
    if (event) {
      const eventUpdateOp = prisma.event.update({
        where: { id: payment.eventId },
        data: { retentionOverrideDays: Math.max(0, event.retentionOverrideDays - days) },
      });
      await prisma.$transaction([paymentUpdateOp, eventUpdateOp]);
    } else {
      await paymentUpdateOp;
    }
  } else {
    await paymentUpdateOp;
  }
}
