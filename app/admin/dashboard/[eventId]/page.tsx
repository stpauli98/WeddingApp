import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma';
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminDashboardTabs from "@/components/admin/AdminDashboardTabs";

import { cookies } from "next/headers";

export default async function AdminDashboardEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  // 1. Provera autentifikacije admina
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  if (!sessionToken) return notFound();

  const adminSession = await prisma.adminSession.findUnique({
    where: { sessionToken },
    include: { admin: true },
  });
  if (!adminSession || !adminSession.admin) return notFound();

  // 2. Dohvati event i proveri vlasništvo
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, coupleName: true, slug: true, adminId: true }
  });
  if (!event || event.adminId !== adminSession.admin.id) return notFound();

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
    <div className="container mx-auto p-6 relative">
      <div className="sticky flex justify-end top-[46px] right-0 z-50">
        <AdminLogoutButton />
      </div>
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-block text-3xl font-extrabold tracking-wide bg-gradient-to-r from-primary/60 via-primary to-primary/60 bg-clip-text text-transparent underline underline-offset-8 decoration-[5px] decoration-primary drop-shadow-md animate-pulse">
            {event.coupleName}
          </span>
          <span className="block text-lg font-medium text-foreground mt-2">
            uživajte u vašim sličicama
          </span>
          <span className="block w-24 h-1 rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-70 mt-2 mb-2"></span>
          <span className="block text-2xl">💍</span>
        </div>
      </div>
      <AdminDashboardTabs guests={guests} event={event} />
    </div>
  );
}
