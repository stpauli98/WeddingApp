// Scheduled Cloudinary credit-usage monitor — invoked daily by Vercel Cron (see vercel.json).
// Requires `Authorization: Bearer ${CRON_SECRET}` header.
//
// Reads monthly credit usage from Cloudinary and emails the owner when usage
// crosses CLOUDINARY_ALERT_THRESHOLD (default 80%) to avoid hitting the
// Free plan's 25-credit hard cap which blocks image/video delivery.

import { timingSafeEqual } from 'crypto';
import cloudinary from '@/lib/cloudinary';
import { sendCloudinaryUsageAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function safeCompareBearer(header: string, secret: string): boolean {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!safeCompareBearer(authHeader, process.env.CRON_SECRET || '')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const threshold = Number(process.env.CLOUDINARY_ALERT_THRESHOLD || '80');
  const to = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || '';

  let usage = 0;
  let limit = 0;
  try {
    const data = await cloudinary.api.usage();
    usage = data?.credits?.usage ?? 0;
    limit = data?.credits?.limit ?? 0;
  } catch (err) {
    console.error('[cloudinary-usage] api.usage failed', err);
    return jsonResponse({ error: 'usage_fetch_failed' }, 502);
  }

  const percent = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  let alerted = false;
  if (percent >= threshold && to) {
    try {
      await sendCloudinaryUsageAlertEmail({ usedPercent: percent, usage, limit, to });
      alerted = true;
    } catch (err) {
      console.error('[cloudinary-usage] alert email failed', err);
    }
  }

  return jsonResponse({ usage, limit, percent, alerted });
}
