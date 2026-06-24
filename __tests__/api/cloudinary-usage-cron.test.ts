/** @jest-environment node */
process.env.CRON_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'owner@example.com';

jest.mock('@/lib/cloudinary', () => ({ __esModule: true, default: { api: { usage: jest.fn() } } }));
jest.mock('@/lib/email', () => ({ sendCloudinaryUsageAlertEmail: jest.fn().mockResolvedValue(undefined) }));

import { GET } from '@/app/api/cron/cloudinary-usage/route';
import cloudinary from '@/lib/cloudinary';
import { sendCloudinaryUsageAlertEmail } from '@/lib/email';

const req = (auth?: string) =>
  new Request('http://x/api/cron/cloudinary-usage', { headers: auth ? { authorization: auth } : {} }) as any;

beforeEach(() => jest.clearAllMocks());

it('rejects without the cron bearer token', async () => {
  const res = await GET(req());
  expect(res.status).toBe(401);
});

it('alerts when usage is at/over the 80% threshold', async () => {
  (cloudinary.api.usage as jest.Mock).mockResolvedValue({ credits: { usage: 21, limit: 25 } }); // 84%
  const res = await GET(req('Bearer test-secret'));
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.alerted).toBe(true);
  expect(sendCloudinaryUsageAlertEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'owner@example.com', usage: 21, limit: 25 })
  );
});

it('does not alert when under threshold', async () => {
  (cloudinary.api.usage as jest.Mock).mockResolvedValue({ credits: { usage: 5, limit: 25 } }); // 20%
  const res = await GET(req('Bearer test-secret'));
  const body = await res.json();
  expect(body.alerted).toBe(false);
  expect(sendCloudinaryUsageAlertEmail).not.toHaveBeenCalled();
});
