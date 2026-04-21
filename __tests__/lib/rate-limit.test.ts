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
  afterEach(() => {
    (process.env as any).NODE_ENV = origEnv;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('factory never throws (lazy resolution)', () => {
    (process.env as any).NODE_ENV = 'production';
    expect(() => createRateLimiter({ name: 'x', max: 1, windowMs: 1000 })).not.toThrow();
  });

  it('first .check() throws in production when Upstash env vars are missing', async () => {
    (process.env as any).NODE_ENV = 'production';
    const limiter = createRateLimiter({ name: 'x', max: 1, windowMs: 1000 });
    await expect(limiter.check('k')).rejects.toThrow(/UPSTASH_REDIS_REST/);
  });

  it('first .check() throws in production when only URL is set', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    const limiter = createRateLimiter({ name: 'x', max: 1, windowMs: 1000 });
    await expect(limiter.check('k')).rejects.toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  it('uses in-memory in test/development regardless of env vars', async () => {
    (process.env as any).NODE_ENV = 'test';
    const limiter = createRateLimiter({ name: 'x', max: 1, windowMs: 1000 });
    await expect(limiter.check('k')).resolves.toEqual(expect.objectContaining({ success: true }));
  });
});
