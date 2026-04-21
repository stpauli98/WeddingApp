import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimiter {
  check(key: string): Promise<{ success: boolean; remaining: number }>;
}

interface Config { name: string; max: number; windowMs: number; }

function inMemoryLimiter(cfg: Config): RateLimiter {
  const globalKey = `__rl_${cfg.name}` as const;
  const g = globalThis as any;
  const store: Map<string, number[]> = g[globalKey] || new Map();
  g[globalKey] = store;
  return {
    async check(key: string) {
      const now = Date.now();
      const recent = (store.get(key) || []).filter(ts => now - ts < cfg.windowMs);
      if (recent.length >= cfg.max) return { success: false, remaining: 0 };
      store.set(key, [...recent, now]);
      return { success: true, remaining: cfg.max - recent.length - 1 };
    },
  };
}

function upstashLimiter(cfg: Config): RateLimiter {
  const redis = Redis.fromEnv();
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.max, `${cfg.windowMs} ms`),
    prefix: `rl:${cfg.name}`,
    analytics: false,
  });
  return {
    async check(key: string) {
      const { success, remaining } = await rl.limit(key);
      return { success, remaining };
    },
  };
}

export function createRateLimiter(cfg: Config): RateLimiter {
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasUrl && hasToken) return upstashLimiter(cfg);

  // `next build` sets NODE_ENV=production while collecting page data, which
  // imports every route module and runs this factory. Rate-limit is never
  // called during build, so the in-memory fallback is safe there.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    const missing = [
      !hasUrl && 'UPSTASH_REDIS_REST_URL',
      !hasToken && 'UPSTASH_REDIS_REST_TOKEN',
    ].filter(Boolean).join(', ');
    throw new Error(
      `Rate-limit requires Upstash in production. Missing env var(s): ${missing}. ` +
      `Set them or explicitly opt into in-memory fallback via UPSTASH_FALLBACK_ALLOWED=1.`
    );
  }

  return inMemoryLimiter(cfg);
}
