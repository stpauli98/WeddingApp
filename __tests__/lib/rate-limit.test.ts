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
