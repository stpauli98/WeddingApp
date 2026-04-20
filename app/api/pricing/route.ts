import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { active: true },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    const result = plans.map((plan: any) => ({
      tier: plan.tier,
      name: { sr: plan.nameSr, en: plan.nameEn },
      imageLimit: plan.imageLimit,
      clientResizeMaxWidth: plan.clientResizeMaxWidth,
      clientQuality: plan.clientQuality,
      storeOriginal: plan.storeOriginal,
      price: plan.price,
      recommended: plan.recommended,
      features: plan.features.map((f: any) => ({ sr: f.textSr, en: f.textEn })),
    }));

    return NextResponse.json(result);
  } catch {
    // Fallback to hardcoded if DB fails
    const { PRICING_TIERS } = await import('@/lib/pricing-tiers');
    const result = Object.entries(PRICING_TIERS).map(([tier, config]) => ({
      tier,
      ...config,
    }));
    return NextResponse.json(result);
  }
}
