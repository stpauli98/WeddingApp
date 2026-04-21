/** @jest-environment node */
import { createRateLimiter } from '@/lib/security/rate-limit';

describe('createRateLimiter (in-memory fallback)', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('allows up to N requests then blocks', async () => {
    const limiter = createRateLimiter({ name: 'test-a', max: 3, windowMs: 1000 });
    expect((await limiter.check('1.1.1.1')).success).toBe(true);
    expect((await limiter.check('1.1.1.1')).success).toBe(true);
    expect((await limiter.check('1.1.1.1')).success).toBe(true);
    expect((await limiter.check('1.1.1.1')).success).toBe(false);
  });

  it('isolates by key', async () => {
    const limiter = createRateLimiter({ name: 'test-b', max: 1, windowMs: 1000 });
    expect((await limiter.check('a')).success).toBe(true);
    expect((await limiter.check('b')).success).toBe(true);
    expect((await limiter.check('a')).success).toBe(false);
  });
});

describe('createRateLimiter (production guard)', () => {
  const origEnv = process.env.NODE_ENV;
  const origPhase = process.env.NEXT_PHASE;
  afterEach(() => {
    (process.env as any).NODE_ENV = origEnv;
    process.env.NEXT_PHASE = origPhase;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('throws in production when Upstash env vars are missing', () => {
    (process.env as any).NODE_ENV = 'production';
    expect(() => createRateLimiter({ name: 'x', max: 1, windowMs: 1000 }))
      .toThrow(/UPSTASH_REDIS_REST/);
  });

  it('throws in production when only URL is set', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    // token missing
    expect(() => createRateLimiter({ name: 'x', max: 1, windowMs: 1000 }))
      .toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  it('uses in-memory in test/development regardless of env vars', () => {
    (process.env as any).NODE_ENV = 'test';
    expect(() => createRateLimiter({ name: 'x', max: 1, windowMs: 1000 })).not.toThrow();
  });

  it('does not throw during next build phase even if env vars missing', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(() => createRateLimiter({ name: 'x', max: 1, windowMs: 1000 })).not.toThrow();
  });
});
