/**
 * @jest-environment node
 *
 * Retention cron invariants:
 *  1. Guest email with marketingConsent=false is NEVER written to MarketingContact.
 *  2. Guest email with marketingConsent=true IS written on expiry.
 *  3. Warning emails are idempotent (deletionWarningSentAt guard).
 *  4. Events whose deletedAt is already set are skipped.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    guest: { updateMany: jest.fn(), deleteMany: jest.fn() },
    adminSession: { deleteMany: jest.fn() },
    event: { findMany: jest.fn(), update: jest.fn() },
    marketingContact: { upsert: jest.fn() },
    image: { deleteMany: jest.fn() },
    message: { deleteMany: jest.fn() },
    payment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

jest.mock('@/lib/email', () => ({
  sendDeletionWarningEmail: jest.fn().mockResolvedValue(undefined),
  sendGuestDeletionEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: { api: { delete_resources: jest.fn().mockResolvedValue({}) } },
}));

import { GET } from '@/app/api/cron/cleanup/route';
import { prisma } from '@/lib/prisma';
import { sendDeletionWarningEmail, sendGuestDeletionEmail } from '@/lib/email';

const marketingUpsert = prisma.marketingContact.upsert as jest.MockedFunction<any>;
const eventFindMany = prisma.event.findMany as jest.MockedFunction<any>;
const eventUpdate = prisma.event.update as jest.MockedFunction<any>;
const guestUpdateMany = prisma.guest.updateMany as jest.MockedFunction<any>;
const adminSessionDeleteMany = prisma.adminSession.deleteMany as jest.MockedFunction<any>;
const sendWarning = sendDeletionWarningEmail as jest.MockedFunction<any>;
const sendGuestDelete = sendGuestDeletionEmail as jest.MockedFunction<any>;

function buildReq(): Request {
  return new Request('http://localhost/api/cron/cleanup', {
    method: 'GET',
    headers: { authorization: 'Bearer test-secret' },
  });
}

const EXPIRED_FREE_EVENT_DATE = new Date(Date.now() - 31 * 86400000); // 31d ago (free = 30d)
const WARNING_WINDOW_EVENT_DATE = new Date(Date.now() - 29 * 86400000); // 29d ago → expires in 1d (within 2d warning window)

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
  // Reset per-IP rate-limit map (module captured reference — clear in place).
  (globalThis as any).__cronCleanupAttempts?.clear();
  guestUpdateMany.mockResolvedValue({ count: 0 });
  adminSessionDeleteMany.mockResolvedValue({ count: 0 });
  eventFindMany.mockResolvedValue([]);
  eventUpdate.mockResolvedValue({});
  marketingUpsert.mockResolvedValue({});
});

describe('cron cleanup — retention invariants', () => {
  it('rejects unauthenticated request', async () => {
    const res = await GET(
      new Request('http://localhost/api/cron/cleanup', { method: 'GET' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 429 after exceeding per-IP rate limit (6/h)', async () => {
    for (let i = 0; i < 6; i++) {
      const r = await GET(buildReq());
      expect(r.status).toBe(200);
    }
    const res = await GET(buildReq());
    expect(res.status).toBe(429);
  });

  it('does NOT harvest non-consented guest email on expiry', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 'test-event',
        coupleName: 'A & B',
        date: EXPIRED_FREE_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: { email: 'admin@x.com', language: 'sr', createdAt: new Date(), marketingConsent: false },
        guests: [
          {
            id: 'g1',
            email: 'notconsented@x.com',
            marketingConsent: false,
            createdAt: new Date(),
            images: [],
            message: null,
          },
        ],
      },
    ]);

    const res = await GET(buildReq());
    expect(res.status).toBe(200);

    // Admin upsert is allowed; guest upsert must not include notconsented email.
    const allUpsertCalls = marketingUpsert.mock.calls;
    const guestUpserts = allUpsertCalls.filter(
      (c: any) => c[0]?.where?.email_source?.source === 'guest'
    );
    expect(guestUpserts.length).toBe(0);
  });

  it('harvests consented guest email but NOT admin without consent', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 'test-event',
        coupleName: 'A & B',
        date: EXPIRED_FREE_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: {
          email: 'admin@x.com',
          language: 'sr',
          createdAt: new Date(),
          marketingConsent: false,
        },
        guests: [
          {
            id: 'g1',
            email: 'yes@x.com',
            marketingConsent: true,
            createdAt: new Date(),
            images: [],
            message: null,
          },
        ],
      },
    ]);

    await GET(buildReq());

    const upsertedEmails = marketingUpsert.mock.calls.map(
      (c: any) => `${c[0].where.email_source.email}:${c[0].where.email_source.source}`
    );
    expect(upsertedEmails).toContain('yes@x.com:guest');
    expect(upsertedEmails).not.toContain('admin@x.com:admin'); // no opt-in ⇒ no harvest
  });

  it('harvests admin email when admin.marketingConsent=true', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e2',
        slug: 'test-event-2',
        coupleName: 'C & D',
        date: EXPIRED_FREE_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: {
          email: 'opted-in@x.com',
          language: 'sr',
          createdAt: new Date(),
          marketingConsent: true,
        },
        guests: [],
      },
    ]);

    await GET(buildReq());

    const upsertedEmails = marketingUpsert.mock.calls.map(
      (c: any) => `${c[0].where.email_source.email}:${c[0].where.email_source.source}`
    );
    expect(upsertedEmails).toContain('opted-in@x.com:admin');
  });

  it('sends warning email exactly once and sets deletionWarningSentAt', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 'test-event',
        coupleName: 'A & B',
        date: WARNING_WINDOW_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: { email: 'admin@x.com', language: 'sr', createdAt: new Date(), marketingConsent: false },
        guests: [],
      },
    ]);

    await GET(buildReq());

    expect(sendWarning).toHaveBeenCalledTimes(1);
    expect(eventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: expect.objectContaining({ deletionWarningSentAt: expect.any(Date) }),
      })
    );
  });

  it('skips warning when deletionWarningSentAt already set', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 'test-event',
        coupleName: 'A & B',
        date: WARNING_WINDOW_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: new Date(),
        admin: { email: 'admin@x.com', language: 'sr', createdAt: new Date(), marketingConsent: false },
        guests: [],
      },
    ]);

    await GET(buildReq());

    expect(sendWarning).not.toHaveBeenCalled();
  });

  it('does not reprocess soft-deleted events (query filters by deletedAt: null)', async () => {
    // Route's findMany uses { where: { deletedAt: null } } — verify query contract.
    await GET(buildReq());
    const whereArg = eventFindMany.mock.calls[0]?.[0]?.where;
    expect(whereArg).toEqual(expect.objectContaining({ deletedAt: null }));
  });

  it('sends deletion notification email to each guest on hard delete', async () => {
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 'multi-guest',
        coupleName: 'A & B',
        date: EXPIRED_FREE_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: {
          email: 'a@x.com',
          language: 'sr',
          createdAt: new Date(),
          marketingConsent: false,
        },
        guests: [
          {
            id: 'g1',
            email: 'g1@x.com',
            marketingConsent: true,
            createdAt: new Date(),
            images: [],
            message: null,
          },
          {
            id: 'g2',
            email: 'g2@x.com',
            marketingConsent: false,
            createdAt: new Date(),
            images: [],
            message: null,
          },
        ],
      },
    ]);

    await GET(buildReq());

    expect(sendGuestDelete).toHaveBeenCalledTimes(2);
    const callEmails = sendGuestDelete.mock.calls.map((c: any) => c[0].to);
    expect(callEmails).toEqual(expect.arrayContaining(['g1@x.com', 'g2@x.com']));
    // consented flag passed through correctly
    const consentMap = Object.fromEntries(
      sendGuestDelete.mock.calls.map((c: any) => [c[0].to, c[0].consented])
    );
    expect(consentMap['g1@x.com']).toBe(true);
    expect(consentMap['g2@x.com']).toBe(false);
  });

  it('chunks Cloudinary delete into batches of 100', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cloudinary = require('@/lib/cloudinary').default;
    const mockDelete = cloudinary.api.delete_resources as jest.Mock;
    mockDelete.mockClear();

    const paths = Array.from({ length: 250 }, (_, i) => `p${i}`);
    eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        slug: 's',
        coupleName: 'C',
        date: EXPIRED_FREE_EVENT_DATE,
        pricingTier: 'free',
        deletionWarningSentAt: null,
        admin: {
          email: 'a@x.com',
          language: 'sr',
          createdAt: new Date(),
          marketingConsent: false,
        },
        guests: [
          {
            id: 'g',
            email: 'g@x.com',
            marketingConsent: false,
            createdAt: new Date(),
            images: paths.map((p, i) => ({ id: String(i), storagePath: p })),
            message: null,
          },
        ],
      },
    ]);

    await GET(buildReq());

    expect(mockDelete).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    expect(mockDelete.mock.calls[0][0]).toHaveLength(100);
    expect(mockDelete.mock.calls[2][0]).toHaveLength(50);
  });
});
