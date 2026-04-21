import { generateSessionToken } from '@/lib/security/session-token';

describe('generateSessionToken', () => {
  it('returns 64-char hex string', () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns distinct values across 100 calls', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateSessionToken()));
    expect(set.size).toBe(100);
  });
});
