/** @jest-environment node */
import { getRequestIp } from '@/lib/security/request-ip';

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://x', { headers });
}

describe('getRequestIp', () => {
  it('returns first CSV entry, trimmed', () => {
    expect(getRequestIp(reqWith({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8 ' }))).toBe('1.2.3.4');
  });
  it('returns "unknown" when header absent', () => {
    expect(getRequestIp(reqWith({}))).toBe('unknown');
  });
  it('returns "unknown" on empty header', () => {
    expect(getRequestIp(reqWith({ 'x-forwarded-for': '' }))).toBe('unknown');
  });
});
