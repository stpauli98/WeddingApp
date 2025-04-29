import { prisma } from '@/lib/prisma'

// Server komponenta za prikaz gostiju iz baze
import { redirect } from "next/navigation"

export default async function AdminDashboardPage() {
  // Pronađi poslednji event i redirectuj na njegov dashboard (ili prikaži poruku)
  const lastEvent = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' } });
  if (lastEvent) {
    redirect(`/admin/dashboard/${lastEvent.id}`);
  }
  // Ako nema eventova, prikaži info adminu
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Nema kreiranih događaja</h1>
      <p>Napravite novi event da biste videli dashboard.</p>
    </div>
  );
}
