/**
 * @jest-environment node
 */
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/lib/lemon-squeezy';

const SECRET = 'test-webhook-secret';

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const sig = sign('{"foo":"bar"}', SECRET);
    expect(verifyWebhookSignature('{"foo":"baz"}', sig, SECRET)).toBe(false);
  });

  it('returns false for tampered signature (1 byte flipped)', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    const tampered = sig.slice(0, -1) + (sig.slice(-1) === '0' ? '1' : '0');
    expect(verifyWebhookSignature(body, tampered, SECRET)).toBe(false);
  });

  it('returns false for different-length signature', () => {
    const body = '{"foo":"bar"}';
    expect(verifyWebhookSignature(body, 'short', SECRET)).toBe(false);
  });

  it('returns false for missing secret', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    expect(verifyWebhookSignature(body, sig, '')).toBe(false);
  });

  it('returns false for non-hex signature', () => {
    const body = '{"foo":"bar"}';
    expect(verifyWebhookSignature(body, 'zzzz', SECRET)).toBe(false);
  });
});
