import crypto from 'crypto';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy/signature';

const SECRET = 'test_signing_secret';
const BODY = JSON.stringify({ meta: { event_name: 'order_created' }, data: {} });

function sign(body: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyLemonSqueezySignature', () => {
  it('returns true for valid signature', () => {
    const sig = sign(BODY);
    expect(verifyLemonSqueezySignature(BODY, sig, SECRET)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyLemonSqueezySignature(BODY, 'badsig', SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyLemonSqueezySignature(BODY, '', SECRET)).toBe(false);
  });

  it('returns false for tampered body', () => {
    const sig = sign(BODY);
    expect(verifyLemonSqueezySignature(BODY + 'x', sig, SECRET)).toBe(false);
  });

  it('returns false if signature length differs (timing-safe guard)', () => {
    expect(verifyLemonSqueezySignature(BODY, 'aa', SECRET)).toBe(false);
  });

  it('returns false for empty secret (misconfigured)', () => {
    const sig = sign(BODY);
    expect(verifyLemonSqueezySignature(BODY, sig, '')).toBe(false);
  });

  it('returns false for non-hex signature without throwing', () => {
    // Buffer.from('not-hex-!', 'hex') silently returns partial bytes; the function must still return false
    expect(verifyLemonSqueezySignature(BODY, 'not-hex-zzz', SECRET)).toBe(false);
  });
});
