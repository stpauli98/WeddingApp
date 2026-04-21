import { createSecret, createToken, verifyToken, utoa, atou } from '@edge-csrf/core';

// Lazy init: resolve secret on first use, not at module import.
// Eager top-level throw broke Next.js build-time "Collecting page data"
// phase in CI (NODE_ENV=production without CSRF_SECRET set as a build-time
// env var). Build doesn't invoke these functions, so deferring is safe.
let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const base64 = process.env.CSRF_SECRET;
  if (base64) {
    cachedSecret = atou(base64);
    return cachedSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET environment variable is required in production');
  }
  // Dev fallback: ephemeral per-process secret. Never use this in production.
  cachedSecret = createSecret(32);
  return cachedSecret;
}

export async function generateCsrfToken() {
  const tokenUint8 = await createToken(getSecret(), 32);
  const token = utoa(tokenUint8);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `csrf_token=${token}; Path=/; SameSite=Lax; HttpOnly${secure}; Max-Age=3600`;
  return { token, cookie };
}

export async function validateCsrfToken(token: string | undefined) {
  if (!token) return false;
  try {
    const tokenUint8 = atou(token);
    return await verifyToken(tokenUint8, getSecret());
  } catch {
    return false;
  }
}
