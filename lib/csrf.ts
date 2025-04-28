import { createSecret, createToken, verifyToken, utoa, atou } from '@edge-csrf/core';

// Secret mora biti stabilan i privatan! Generiši ga JEDNOM i čuvaj u .env kao base64 string.
const base64Secret = process.env.CSRF_SECRET || utoa(createSecret(32));
const secret = atou(base64Secret);

// Generiši CSRF token i cookie
export async function generateCsrfToken() {
  const tokenUint8 = await createToken(secret, 32);
  const token = utoa(tokenUint8);
  // Setuj kao cookie string
  const cookie = `csrf_token=${token}; Path=/; SameSite=Lax; HttpOnly; Max-Age=3600`;
  return { token, cookie };
}

// Verifikuj CSRF token iz headera/cookie
export async function validateCsrfToken(token: string | undefined) {
  if (!token) return false;
  try {
    const tokenUint8 = atou(token);
    return await verifyToken(tokenUint8, secret);
  } catch {
    return false;
  }
}
