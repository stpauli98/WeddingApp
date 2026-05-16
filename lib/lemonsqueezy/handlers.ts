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
  custom: { eventId: string; adminId: string; purpose: PaymentPurpose };
}

const RETENTION_DAYS_PER_PURCHASE = 30;
const RETENTION_MAX_OVERRIDE_DAYS = 365;

export function normalizeWebhook(payload: any): NormalizedWebhook | null {
  const eventName = payload?.meta?.event_name;
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return null;
  const lsEventId = payload?.meta?.event_id;
  const lsOrderId = payload?.data?.id;
  const custom = payload?.meta?.custom_data;
  const attrs = payload?.data?.attributes;
  if (!lsEventId || !lsOrderId || !custom?.eventId || !custom?.adminId || !custom?.purpose || !attrs) {
    return null;
  }
  return {
    lsEventId: String(lsEventId),
    lsOrderId: String(lsOrderId),
    eventName,
    customerEmail: String(attrs.user_email ?? ''),
    amountCents: Number(attrs.total) || 0,
    currency: String(attrs.currency ?? 'EUR'),
    custom: {
      eventId: String(custom.eventId),
      adminId: String(custom.adminId),
      purpose: custom.purpose as PaymentPurpose,
    },
  };
}

export async function handleInitialPurchase(w: NormalizedWebhook): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);
  if (event.pricingTier === 'free') throw new Error('free tier should never reach this handler');

  await prisma.payment.upsert({
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

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      activatedAt: new Date(),
      pendingPaymentExpiresAt: null,
    },
  });
}

export async function handleUpgrade(w: NormalizedWebhook, payload: any): Promise<void> {
  const toTier = payload?.meta?.custom_data?.toTier as PricingTier | undefined;
  if (!toTier || toTier === 'free') throw new Error('upgrade webhook missing toTier or is free');

  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, imageLimit: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);

  const plan = await prisma.pricingPlan.findUnique({
    where: { tier: toTier },
    select: { imageLimit: true },
  });
  const newImageLimit = plan?.imageLimit ?? PRICING_TIERS[toTier].imageLimit;

  await prisma.payment.upsert({
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

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: { pricingTier: toTier, imageLimit: newImageLimit },
  });
}

export async function handleRetentionExtension(w: NormalizedWebhook): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, retentionOverrideDays: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);
  if (event.pricingTier === 'free') throw new Error('free tier cannot have retention extension');

  const newOverride = Math.min(
    event.retentionOverrideDays + RETENTION_DAYS_PER_PURCHASE,
    RETENTION_MAX_OVERRIDE_DAYS
  );

  await prisma.payment.upsert({
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

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      retentionOverrideDays: newOverride,
      deletionWarningSentAt: null,
    },
  });
}

export async function handleRefund(w: NormalizedWebhook): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { lsOrderId: w.lsOrderId },
    select: { id: true, purpose: true, eventId: true, retentionDaysGranted: true, metadata: true },
  });
  if (!payment) {
    console.warn(`Refund webhook for unknown order ${w.lsOrderId}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'refunded',
      refundedAmountCents: w.amountCents,
      refundedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (payment.purpose === 'initial_purchase') {
    await prisma.event.update({
      where: { id: payment.eventId },
      data: { activatedAt: null },
    });
  } else if (payment.purpose === 'upgrade') {
    const meta = (payment.metadata as any) || {};
    if (meta.previousTier && meta.previousImageLimit != null) {
      await prisma.event.update({
        where: { id: payment.eventId },
        data: {
          pricingTier: meta.previousTier,
          imageLimit: meta.previousImageLimit,
        },
      });
    }
  } else if (payment.purpose === 'retention_extension') {
    const days = payment.retentionDaysGranted ?? 0;
    const event = await prisma.event.findUnique({
      where: { id: payment.eventId },
      select: { retentionOverrideDays: true },
    });
    if (event) {
      await prisma.event.update({
        where: { id: payment.eventId },
        data: { retentionOverrideDays: Math.max(0, event.retentionOverrideDays - days) },
      });
    }
  }
}
