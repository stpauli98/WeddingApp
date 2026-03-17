import { PrismaClient } from '@prisma/client';
import { withOptimize } from '@prisma/extension-optimize';

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

  // Prisma Optimize extension za query monitoring
  if (process.env.OPTIMIZE_API_KEY && process.env.NODE_ENV !== 'production') {
    return baseClient.$extends(
      withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY })
    );
  }

  return baseClient;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
