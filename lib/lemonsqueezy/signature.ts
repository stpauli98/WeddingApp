import crypto from 'crypto';

/**
 * Verify LemonSqueezy webhook signature.
 * LS signs the raw request body with HMAC-SHA256 using the webhook signing secret.
 * The signature arrives in the `X-Signature` header as a hex string.
 *
 * Uses timingSafeEqual to prevent timing attacks. Returns false for any
 * non-match, including malformed input — never throws.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(computed, 'hex');
  let b: Buffer;
  try {
    b = Buffer.from(signatureHeader, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
