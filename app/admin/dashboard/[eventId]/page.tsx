import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma';
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import AdminDashboardTabs from "@/components/admin/AdminDashboardTabs";
import AdminDashboardWelcome from "@/components/admin/AdminDashboardWelcome";
import { SUPPORTED_LANGUAGES } from "@/lib/utils/language";

import { cookies } from "next/headers";

// Funkcija koja detektira jezik iz URL segmenta
function getLanguageFromPathSegments(path: string): string {
  // Razdvoji URL na segmente
  const segments = path.split('/');
  
  // Provjeri je li prvi segment nakon /admin/dashboard/ jedan od podržanih jezika
  if (segments.length > 3) {
    const potentialLang = segments[1]; // Prvi segment nakon /
    if (SUPPORTED_LANGUAGES.includes(potentialLang)) {
      return potentialLang;
    }
  }
  
  // Defaultni jezik ako nije pronađen u URL-u
  return 'sr';
}

export default async function AdminDashboardEventPage({ params, searchParams }: { 
  params: Promise<{ eventId: string }>,
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const { eventId } = await params;
  
  // Dohvaćamo segment iz URL-a za detekciju jezika
  // U Next.js 14 App Routeru, možemo koristiti segment iz URL-a
  const pathname = searchParams?._pathname as string || '';
  const urlLanguage = getLanguageFromPathSegments(pathname);
  

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
    select: { id: true, coupleName: true, slug: true, adminId: true, language: true }
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
          <span className="block w-24 h-1 rounded-full bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] opacity-70 mt-2 mb-2"></span>
          <span className="block text-2xl">💍</span>
        </div>
      </div>
      <AdminDashboardTabs guests={guests} event={event} />
    </div>
  );
}
