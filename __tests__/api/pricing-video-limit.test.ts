/** @jest-environment node */
// __tests__/api/pricing-video-limit.test.ts
import { GET } from '@/app/api/pricing/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pricingPlan: {
      findMany: jest.fn().mockResolvedValue([
        {
          tier: 'premium', nameSr: 'Premium', nameEn: 'Premium',
          imageLimit: 25, videoLimit: 3, clientResizeMaxWidth: 1920,
          clientQuality: 0.95, storeOriginal: true, price: 7500,
          recommended: false, features: [],
        },
      ]),
    },
  },
}));

it('exposes videoLimit per plan', async () => {
  const res = await GET();
  const body = await res.json();
  expect(body[0].videoLimit).toBe(3);
});
