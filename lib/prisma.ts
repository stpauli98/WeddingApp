import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
  baseClient?: PrismaClient;
};

function createPrismaClient() {
  // Skip Prisma initialization during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null as any;
  }

  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : ['error'],
  });

  // Setup slow query logging u development mode (prije extensions)
  if (process.env.NODE_ENV !== 'production') {
    baseClient.$on('query' as any, (e: any) => {
      if (e.duration > 100) {
        console.log('🐢 Slow Query detected:', {
          duration: `${e.duration}ms`,
          query: e.query.substring(0, 100) + '...',
          params: e.params,
        });
      }
    });
  }

  // Store base client globally za debug
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.baseClient = baseClient;
  }

  // Prisma Optimize was sunset Apr 2026 (returns HTTP 410).
  // Slow-query logging above uses Prisma's native $on('query') event —
  // no Optimize extension needed.
  return baseClient;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
