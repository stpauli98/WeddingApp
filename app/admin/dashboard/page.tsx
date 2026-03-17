export const metadata = {
  title: 'Admin Dashboard | WeddingApp',
  description: 'Pregled i upravljanje svadbenim dogadjajem i gostima.',
  robots: 'noindex, nofollow'
};

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const languagePrefix = cookieStore.get('i18nextLng')?.value || 'sr';

  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect(`/${languagePrefix}/admin/login`);
  }

  // Pronadji event koji pripada ovom adminu
  const event = await prisma.event.findFirst({ where: { adminId: admin.id } });
  if (event) {
    redirect(`/${languagePrefix}/admin/dashboard/${event.id}`);
  }

  // Ako nema eventa, preusmeri na kreiranje eventa
  redirect(`/${languagePrefix}/admin/event`);
}
