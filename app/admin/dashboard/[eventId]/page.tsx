import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma';
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminDashboardTabs from "@/components/admin/AdminDashboardTabs";
import AdminDashboardWelcome from "@/components/admin/AdminDashboardWelcome";
import { EventTierBadge } from "@/components/admin/EventTierBadge";
import { PricingTier } from "@/lib/pricing-tiers";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export default async function AdminDashboardEventPage({ params }: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params;

  // 1. Provera autentifikacije admina (uklj. provjeru isteka sesije)
  const admin = await getAuthenticatedAdmin();
  if (!admin) return notFound();

  // 2. Dohvati event i proveri vlasništvo
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      coupleName: true,
      slug: true,
      adminId: true,
      language: true,
      pricingTier: true,
      imageLimit: true
    }
  });
  if (!event || event.adminId !== admin.id) return notFound();

  // 3. Dohvati goste SAMO za ovaj event
  const guests = await prisma.guest.findMany({
    where: { eventId },
    include: {
      images: true,
      message: true,
      event: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto p-6 relative bg-[hsl(var(--lp-bg))]">
      <div className="sticky flex justify-end top-[46px] right-0 z-50 mb-4">
        <AdminLogoutButton language={event.language} />
      </div>
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-block text-3xl font-extrabold tracking-wide bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] bg-clip-text text-transparent underline underline-offset-8 decoration-[5px] decoration-[hsl(var(--lp-accent))] drop-shadow-md animate-pulse">
            {event.coupleName}
          </span>
          <AdminDashboardWelcome eventLanguage={event.language} />

          {/* Display current pricing tier */}
          <div className="mt-4 mb-2">
            <EventTierBadge
              tier={event.pricingTier as PricingTier}
              imageLimit={event.imageLimit || 10}
              language={event.language as 'sr' | 'en'}
              variant="badge"
            />
          </div>

          <span className="block w-24 h-1 rounded-full bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] opacity-70 mt-2 mb-2"></span>
          <span className="block text-2xl">💍</span>
        </div>
      </div>
      <AdminDashboardTabs guests={guests} event={event} />
    </div>
  );
}
