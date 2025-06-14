export const metadata = {
  title: 'Admin Dashboard | WeddingApp',
  description: 'Pregled i upravljanje svadbenim događajem i gostima.',
  robots: 'noindex, nofollow'
};

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  // 1. Dohvati session token i jezik iz cookie-ja
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  const languagePrefix = cookieStore.get('i18nextLng')?.value || 'sr';
  
  if (!sessionToken) {
    redirect(`/${languagePrefix}/admin/login`);
  }

  // 2. Pronađi admina preko session tokena
  const adminSession = await prisma.adminSession.findUnique({
    where: { sessionToken },
    include: { admin: true },
  });
  if (!adminSession || !adminSession.admin) {
    redirect(`/${languagePrefix}/admin/login`);
  }

  // 3. Pronađi event koji pripada ovom adminu
  const event = await prisma.event.findFirst({ where: { adminId: adminSession.admin.id } });
  if (event) {
    redirect(`/${languagePrefix}/admin/dashboard/${event.id}`);
  }

  // 4. Ako nema eventa, preusmeri na kreiranje eventa
  redirect(`/${languagePrefix}/admin/event`);
}
