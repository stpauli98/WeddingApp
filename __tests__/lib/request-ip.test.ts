/** @jest-environment node */
import { getRequestIp } from '@/lib/security/request-ip';

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://x', { headers });
}

describe('getRequestIp', () => {
  it('prefers x-real-ip over x-forwarded-for (anti-spoof)', () => {
    const req = reqWith({
      'x-real-ip': '1.2.3.4',
      'x-forwarded-for': '99.99.99.99', // attacker-supplied
    });
    expect(getRequestIp(req)).toBe('1.2.3.4');
  });

  it('falls back to first XFF value if x-real-ip missing (local dev)', () => {
    const req = reqWith({ 'x-forwarded-for': '5.6.7.8, 1.1.1.1' });
    expect(getRequestIp(req)).toBe('5.6.7.8');
  });

  it('returns "unknown" if no IP headers present', () => {
    const req = reqWith({});
    expect(getRequestIp(req)).toBe('unknown');
  });

  it('trims whitespace from x-real-ip', () => {
    const req = reqWith({ 'x-real-ip': '  1.2.3.4  ' });
    expect(getRequestIp(req)).toBe('1.2.3.4');
  });

  it('returns first CSV entry from XFF, trimmed (legacy fallback)', () => {
    expect(getRequestIp(reqWith({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8 ' }))).toBe('1.2.3.4');
  });

  it('returns "unknown" when XFF header absent', () => {
    expect(getRequestIp(reqWith({}))).toBe('unknown');
  });

  it('returns "unknown" on empty XFF header', () => {
    expect(getRequestIp(reqWith({ 'x-forwarded-for': '' }))).toBe('unknown');
  });
});
