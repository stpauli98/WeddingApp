/** @jest-environment node */
import crypto from 'crypto';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: {
      create: jest.fn(async () => ({ id: 'wl1' })),
      update: jest.fn(async () => ({ id: 'wl1' })),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pricingPlan: {
      findUnique: jest.fn(),
    },
    // Execute each prisma promise in the array sequentially.
    $transaction: jest.fn(async (ops: Promise<any>[]) => {
      const results = [];
      for (const op of ops) {
        results.push(await op);
      }
      return results;
    }),
  },
}));

jest.mock('@/lib/security/request-ip', () => ({
  getRequestIp: jest.fn(() => '203.0.113.5'),
}));

// B1: deterministic rate-limiter mock — always allows by default; the rate-limit test
// overrides mockRateLimitCheck directly to simulate exhaustion.
const mockRateLimitCheck = jest.fn(async () => ({ success: true, remaining: 59 }));
jest.mock('@/lib/security/rate-limit', () => ({
  createRateLimiter: () => ({ check: (...args: any[]) => mockRateLimitCheck(...args) }),
}));

import { POST } from '@/app/api/webhooks/lemonsqueezy/route';
import { prisma } from '@/lib/prisma';

const SECRET = 'test_secret';

function validSig(body: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function makeRequest(body: string, signature: string) {
  return new Request('https://x/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'x-signature': signature, 'content-type': 'application/json' },
    body,
  });
}

describe('POST /api/webhooks/lemonsqueezy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
    // Reset rate-limiter mock to default "allow" behaviour before each test.
    mockRateLimitCheck.mockReset();
    mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 59 });
  });

  it('rejects 401 for invalid signature and does NOT write to WebhookLog (B1)', async () => {
    const body = JSON.stringify({ meta: { event_name: 'order_created', webhook_id: 'wh_1' }, data: {} });
    const res = await POST(makeRequest(body, 'badhex'));
    expect(res.status).toBe(401);
    // After B1: unsigned traffic must not touch the DB.
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
  });

  it('rejects 401 when no signature header present and does NOT write to WebhookLog (B1)', async () => {
    const body = JSON.stringify({ meta: {} });
    const req = new Request('https://x/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
  });

  it('returns 500 when LEMONSQUEEZY_WEBHOOK_SECRET missing', async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const body = '{}';
    const res = await POST(makeRequest(body, 'anything'));
    expect(res.status).toBe(500);
  });

  it('logs non-JSON body without crashing', async () => {
    const body = 'not json at all';
    await POST(makeRequest(body, validSig(body)));
    expect(prisma.webhookLog.create).toHaveBeenCalled();
    const arg = (prisma.webhookLog.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.payload).toBeDefined();
    expect(arg.data.lsEventId).toBeNull();
    expect(arg.data.eventName).toBeNull();
  });

  it('returns 200 idempotent:true when any Payment with lsEventId already exists (B4)', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_dup', custom_data: { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' } },
      data: { id: 'order_1' },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'p1', status: 'paid', lsEventId: 'wh_dup' });
    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, idempotent: true });
  });

  it('returns 200 ignored:true when payload has no attributes (normalizeWebhook returns null)', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_new', custom_data: { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' } },
      data: { id: 'order_1' },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, ignored: true });
  });

  it('returns 413 for body larger than 64 KB', async () => {
    const huge = 'x'.repeat(65537);
    const res = await POST(makeRequest(huge, validSig(huge)));
    expect(res.status).toBe(413);
    // Should not have written to WebhookLog since we reject before that step
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
  });

  it('truncates oversized lsEventId and eventName before logging (uses valid sig so log is written)', async () => {
    const longId = 'a'.repeat(500);
    const longName = 'b'.repeat(500);
    // body must have attributes so normalizeWebhook doesn't short-circuit before the log assertion
    const body = JSON.stringify({
      meta: { webhook_id: longId, event_name: longName },
      data: {},
    });
    // Valid signature so B1 log-after-verify path writes to DB.
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await POST(makeRequest(body, validSig(body)));
    expect(prisma.webhookLog.create).toHaveBeenCalled();
    const arg = (prisma.webhookLog.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.lsEventId).toHaveLength(255);
    expect(arg.data.eventName).toHaveLength(255);
  });

  it('handles initial_purchase order_created: activates event + creates Payment', async () => {
    const customData = { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_new_1', custom_data: customData },
      data: { id: 'order_555', attributes: { user_email: 'admin@x.com', total: 2500, currency: 'EUR', status: 'paid' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'e1', pricingTier: 'basic' });
    (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
    (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e1' });

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { lsEventId: 'wh_new_1' },
      create: expect.objectContaining({
        eventId: 'e1', tier: 'basic', purpose: 'initial_purchase', status: 'paid', amountCents: 2500,
      }),
    }));
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e1' },
      data: expect.objectContaining({ activatedAt: expect.any(Date), pendingPaymentExpiresAt: null }),
    }));
  });

  it('handles upgrade order_created: updates tier + imageLimit, snapshots previous', async () => {
    const customData = { event_id: 'e2', admin_id: 'a2', purpose: 'upgrade', to_tier: 'premium' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_up_1', custom_data: customData },
      data: { id: 'order_700', attributes: { user_email: 'a@b.c', total: 5000, currency: 'EUR', status: 'paid' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'e2', pricingTier: 'basic', imageLimit: 7 });
    (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValueOnce({ imageLimit: 25 });
    (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p2' });
    (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e2' });

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e2' },
      data: expect.objectContaining({ pricingTier: 'premium', imageLimit: 25 }),
    }));
    expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        purpose: 'upgrade',
        metadata: expect.objectContaining({ previousTier: 'basic', previousImageLimit: 7, toTier: 'premium' }),
      }),
    }));
  });

  it('handles retention_extension order_created: bumps retentionOverrideDays by 30, clamps at 365', async () => {
    const customData = { event_id: 'e3', admin_id: 'a3', purpose: 'retention_extension' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_ret_1', custom_data: customData },
      data: { id: 'order_900', attributes: { user_email: 'a@b.c', total: 1500, currency: 'EUR', status: 'paid' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // route idempotency check
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // handler race guard
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'e3', pricingTier: 'basic', retentionOverrideDays: 60 });
    (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p3' });
    (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e3' });

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e3' },
      data: expect.objectContaining({ retentionOverrideDays: 90, deletionWarningSentAt: null }),
    }));
    expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ purpose: 'retention_extension', retentionDaysGranted: 30 }),
    }));
  });

  it('clamps retention extension at 365 days', async () => {
    const customData = { event_id: 'e4', admin_id: 'a4', purpose: 'retention_extension' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_ret_2', custom_data: customData },
      data: { id: 'order_901', attributes: { user_email: 'a@b.c', total: 1500, currency: 'EUR', status: 'paid' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // route idempotency check
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // handler race guard
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'e4', pricingTier: 'premium', retentionOverrideDays: 360 });
    (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p4' });
    (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e4' });

    await POST(makeRequest(body, validSig(body)));
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ retentionOverrideDays: 365 }),
    }));
  });

  it('handles order_refunded for initial_purchase: clears activatedAt', async () => {
    const customData = { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' };
    const body = JSON.stringify({
      meta: { event_name: 'order_refunded', webhook_id: 'wh_ref_1', custom_data: customData },
      data: { id: 'order_555', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'refunded' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'p1', purpose: 'initial_purchase', eventId: 'e1',
      retentionDaysGranted: null, metadata: null,
    });
    // B2: ownership check — adminId matches custom_data.admin_id ('a1').
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ adminId: 'a1' });

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ status: 'refunded', refundedAt: expect.any(Date) }),
    }));
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e1' },
      data: { activatedAt: null },
    }));
  });

  it('handles order_refunded for upgrade: reverts tier + imageLimit', async () => {
    const customData = { event_id: 'e2', admin_id: 'a2', purpose: 'upgrade' };
    const body = JSON.stringify({
      meta: { event_name: 'order_refunded', webhook_id: 'wh_ref_2', custom_data: customData },
      data: { id: 'order_700', attributes: { user_email: 'a@b.c', total: 5000, currency: 'EUR', status: 'refunded' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'p2', purpose: 'upgrade', eventId: 'e2', retentionDaysGranted: null,
      metadata: { previousTier: 'basic', previousImageLimit: 7, toTier: 'premium' },
    });
    // B2: ownership check — adminId matches custom_data.admin_id ('a2').
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ adminId: 'a2' });

    await POST(makeRequest(body, validSig(body)));
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e2' },
      data: expect.objectContaining({ pricingTier: 'basic', imageLimit: 7 }),
    }));
  });

  it('handles order_refunded for retention_extension: subtracts granted days, clamped at 0', async () => {
    const customData = { event_id: 'e3', admin_id: 'a3', purpose: 'retention_extension' };
    const body = JSON.stringify({
      meta: { event_name: 'order_refunded', webhook_id: 'wh_ref_3', custom_data: customData },
      data: { id: 'order_900', attributes: { user_email: 'a@b.c', total: 1500, currency: 'EUR', status: 'refunded' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.payment.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'p3', purpose: 'retention_extension', eventId: 'e3', retentionDaysGranted: 30, metadata: null,
    });
    // B2: ownership check — adminId matches custom_data.admin_id ('a3').
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ adminId: 'a3' });
    // Existing retention logic: second findUnique for retentionOverrideDays.
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ retentionOverrideDays: 20 });

    await POST(makeRequest(body, validSig(body)));
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e3' },
      data: { retentionOverrideDays: 0 },
    }));
  });

  it('marks WebhookLog.processedAt on success', async () => {
    const customData = { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_proc_1', custom_data: customData },
      data: { id: 'order_111', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'paid' } },
    });
    (prisma.webhookLog.create as jest.Mock).mockResolvedValueOnce({ id: 'wl_proc' });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'e1', pricingTier: 'basic' });
    (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
    (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e1' });

    await POST(makeRequest(body, validSig(body)));
    expect(prisma.webhookLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'wl_proc' },
      data: { processedAt: expect.any(Date) },
    }));
  });

  it('returns 200 ok:true (no error) when event is missing — handler warns + returns gracefully', async () => {
    const customData = { event_id: 'e_missing', admin_id: 'a', purpose: 'initial_purchase' };
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_err_1', custom_data: customData },
      data: { id: 'order_x', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'paid' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce(null); // Event missing -> handler warns + returns

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    // processedAt stamped; no error field
    expect(prisma.webhookLog.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ processedAt: expect.any(Date) }),
    }));
  });

  it('returns 200 ignored for webhook with unknown purpose value', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created', webhook_id: 'wh_bad_purpose', custom_data: { event_id: 'e1', admin_id: 'a1', purpose: 'unknown_value' } },
      data: { id: 'order_x', attributes: { user_email: 'a@b.c', total: 100, currency: 'EUR', status: 'paid' } },
    });
    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, ignored: true });
  });

  it('returns 429 when rate limit exceeded (B1)', async () => {
    // Override mock to simulate exhaustion.
    mockRateLimitCheck.mockResolvedValue({ success: false, remaining: 0 });
    const body = JSON.stringify({ meta: {} });
    const sig = validSig(body);
    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(429);
    // DB must not be touched when rate-limited.
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
  });

  it('refund webhook rejects when custom.adminId does not match event adminId (B2)', async () => {
    const body = JSON.stringify({
      meta: {
        event_name: 'order_refunded',
        webhook_id: 'wh_refund_mismatch',
        custom_data: { event_id: 'e1', admin_id: 'attacker_admin', purpose: 'initial_purchase' },
      },
      data: { id: 'order_xx', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'refunded' } },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // idempotency check
    (prisma.payment.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'p_legit', purpose: 'initial_purchase', eventId: 'e1', retentionDaysGranted: null, metadata: null,
    });
    // B2: ownership check returns a DIFFERENT adminId than attacker_admin.
    (prisma.event.findUnique as jest.Mock).mockResolvedValueOnce({ adminId: 'real_owner' });

    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200); // still ack to LS
    expect(prisma.payment.update).not.toHaveBeenCalled(); // refund NOT applied
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
