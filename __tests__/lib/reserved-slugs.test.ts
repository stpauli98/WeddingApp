import { isReservedSlug, RESERVED_SLUGS } from '@/lib/security/reserved-slugs';

describe('isReservedSlug', () => {
  it('blocks known reserved names (case-insensitive)', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('ADMIN')).toBe(true);
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('_next')).toBe(true);
    expect(isReservedSlug('.well-known')).toBe(true);
    expect(isReservedSlug('dashboard')).toBe(true);
  });
  it('allows legitimate wedding slugs', () => {
    expect(isReservedSlug('ana-marko')).toBe(false);
    expect(isReservedSlug('ivan-i-milica')).toBe(false);
    expect(isReservedSlug('admin-is-cool')).toBe(false); // substring, not exact
  });
  it('handles edge cases', () => {
    expect(isReservedSlug('')).toBe(true);
    expect(isReservedSlug(' admin ')).toBe(true); // trims
  });
  it('exports a non-empty array', () => {
    expect(RESERVED_SLUGS.length).toBeGreaterThan(10);
  });
});
