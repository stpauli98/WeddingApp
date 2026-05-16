/** @jest-environment node */
import crypto from 'crypto';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: { create: jest.fn(async () => ({ id: 'wl1' })) },
    payment: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/security/request-ip', () => ({
  getRequestIp: jest.fn(() => '203.0.113.5'),
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
  });

  it('rejects 401 + logs invalid signature', async () => {
    const body = JSON.stringify({ meta: { event_name: 'order_created', event_id: 'evt_1' }, data: {} });
    const res = await POST(makeRequest(body, 'badhex'));
    expect(res.status).toBe(401);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        signatureValid: false,
        lsEventId: 'evt_1',
        eventName: 'order_created',
        sourceIp: '203.0.113.5',
      }),
    }));
  });

  it('rejects 401 when no signature header present', async () => {
    const body = JSON.stringify({ meta: {} });
    const req = new Request('https://x/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
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

  it('returns 200 idempotent:true when payment with lsEventId already exists and is not pending', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created', event_id: 'evt_dup', custom_data: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' } },
      data: { id: 'order_1' },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'p1', status: 'paid', lsEventId: 'evt_dup' });
    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, idempotent: true });
  });

  it('returns 200 ok when signature valid and no duplicate (dispatch is TBD in later tasks)', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created', event_id: 'evt_new', custom_data: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' } },
      data: { id: 'order_1' },
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(body, validSig(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });
});
