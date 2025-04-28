import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, MessageSquare, User } from "lucide-react"
import { prisma } from '@/lib/prisma'
import AdminLogoutButton from "@/components/admin/AdminLogoutButton"
import AdminGalleryAllImages from "@/components/admin/AdminGalleryAllImages"
import AdminAllMessages from "@/components/admin/AdminAllMessages"
import AdminDownloadAll from "@/components/admin/AdminDownloadAll"
import AdminDownloadTab from "@/components/admin/AdminDownloadTab"
import AdminHelpContact from "@/components/admin/AdminHelpContact"
import AdminDashboardTabs from "@/components/admin/AdminDashboardTabs"

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
