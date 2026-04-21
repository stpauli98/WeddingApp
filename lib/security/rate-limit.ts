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
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashLimiter(cfg);
  }
  return inMemoryLimiter(cfg);
}
