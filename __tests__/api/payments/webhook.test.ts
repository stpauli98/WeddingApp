/**
 * @jest-environment node
 */
import crypto from 'crypto';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: { create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    payment: { update: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    event: { update: jest.fn() },
    pricingPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) =>
      typeof fn === 'function' ? fn(require('@/lib/prisma').prisma) : Promise.all(fn)
    ),
  },
}));
jest.mock('@/lib/entitlement', () => ({
  getEffectiveTier: jest.fn().mockResolvedValue('premium'),
  TIER_ORDER: { free: 0, basic: 1, premium: 2, unlimited: 3 },
  hasRetentionExtension: jest.fn(),
  maxRetentionOverrideDays: jest.fn(),
  isGrandfathered: jest.fn(),
}));
jest.mock('@/lib/telegram', () => ({ sendTelegramAlert: jest.fn() }));

import { POST } from '@/app/api/payments/webhook/route';
import { prisma } from '@/lib/prisma';

const SECRET = 'test-webhook-secret';
process.env.LS_WEBHOOK_SECRET = SECRET;
process.env.LS_STORE_ID = 'store-1';

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

function req(body: string, sig?: string): Request {
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers: {
      'x-signature': sig ?? sign(body),
      'content-type': 'application/json',
    },
    body,
  });
}

const baseOrderCreated = {
  meta: {
    event_name: 'order_created',
    event_id: 'evt-1',
    custom_data: {
      eventId: 'e1',
      adminId: 'a1',
      targetTier: 'premium',
      checkoutInternalId: 'ck1',
    },
    test_mode: false,
  },
  data: {
    id: 'ord-1',
    attributes: {
      store_id: 'store-1',
      total: 3999,
      customer_email: 'a@x.com',
      first_order_item: { variant_id: 'v_premium' },
      customer_name: 'John Doe',
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.pricingPlan.findMany as jest.Mock).mockResolvedValue([
    { lsVariantId: 'v_premium' },
  ]);
  (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
    imageLimit: 50,
  });
  (prisma.webhookLog.upsert as jest.Mock).mockResolvedValue({});
  (prisma.webhookLog.create as jest.Mock).mockResolvedValue({});
  (prisma.webhookLog.update as jest.Mock).mockResolvedValue({});
  (prisma.payment.update as jest.Mock).mockResolvedValue({});
  (prisma.payment.upsert as jest.Mock).mockResolvedValue({});
  (prisma.event.update as jest.Mock).mockResolvedValue({});
});

describe('POST /api/payments/webhook', () => {
  it('rejects invalid signature with 401 and logs', async () => {
    const body = JSON.stringify(baseOrderCreated);
    const bad = '0'.repeat(64);
    const res = await POST(req(body, bad));
    expect(res.status).toBe(401);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signatureValid: false }),
      })
    );
  });

  it('rejects test_mode=true in production', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    const payload = {
      ...baseOrderCreated,
      meta: { ...baseOrderCreated.meta, test_mode: true },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    Object.defineProperty(process.env, 'NODE_ENV', { value: origNodeEnv, configurable: true });
  });

  it('rejects wrong store_id', async () => {
    const payload = {
      ...baseOrderCreated,
      data: {
        ...baseOrderCreated.data,
        attributes: { ...baseOrderCreated.data.attributes, store_id: 'other' },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
  });

  it('rejects unknown variant_id', async () => {
    const payload = {
      ...baseOrderCreated,
      data: {
        ...baseOrderCreated.data,
        attributes: {
          ...baseOrderCreated.data.attributes,
          first_order_item: { variant_id: 'unknown' },
        },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
  });

  it('processes order_created and updates Payment + Event in transaction', async () => {
    const body = JSON.stringify(baseOrderCreated);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lsCheckoutId: 'ck1' },
        data: expect.objectContaining({
          status: 'paid',
          lsOrderId: 'ord-1',
          lsEventId: 'evt-1',
        }),
      })
    );
    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: expect.objectContaining({ pricingTier: 'premium' }),
      })
    );
  });

  it('is idempotent on duplicate lsEventId (upsert no-op)', async () => {
    const body = JSON.stringify(baseOrderCreated);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    // Called twice - same body, should still succeed
    const res2 = await POST(req(body));
    expect(res2.status).toBe(200);
  });

  it('logs unknown event as unknown:*', async () => {
    const payload = {
      ...baseOrderCreated,
      meta: { ...baseOrderCreated.meta, event_name: 'subscription_created' },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(prisma.webhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventName: 'unknown:subscription_created' }),
      })
    );
  });

  it('handles order_refunded with upsert (H3 out-of-order)', async () => {
    const payload = {
      meta: {
        event_name: 'order_refunded',
        event_id: 'evt-2',
        custom_data: {
          eventId: 'e1',
          adminId: 'a1',
          targetTier: 'premium',
          checkoutInternalId: 'ck1',
        },
        test_mode: false,
      },
      data: {
        id: 'ord-1',
        attributes: {
          store_id: 'store-1',
          total: 3999,
          refunded_amount: 3999,
          customer_email: 'a@x.com',
          first_order_item: { variant_id: 'v_premium' },
        },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(prisma.payment.upsert).toHaveBeenCalled();
  });
});
