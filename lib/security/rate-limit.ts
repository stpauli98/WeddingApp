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

function resolveLimiter(cfg: Config): RateLimiter {
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasUrl && hasToken) return upstashLimiter(cfg);

  if (process.env.NODE_ENV === 'production') {
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

export function createRateLimiter(cfg: Config): RateLimiter {
  // Resolve lazily on first `.check()`. Keeps module import side-effect-free
  // so `next build`, CSRF-only GET handlers, and anything else that imports
  // a rate-limited route without calling `.check()` works even when Upstash
  // env vars are missing. The production guard still fires on the first real
  // rate-limit call — there's no silent degrade.
  let impl: RateLimiter | null = null;
  return {
    async check(key: string) {
      if (!impl) impl = resolveLimiter(cfg);
      return impl.check(key);
    },
  };
}
