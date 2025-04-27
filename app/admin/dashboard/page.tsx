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
export default async function AdminDashboardPage() {
  // Pronađi sve goste, sa slikama i porukama
  const guests = await prisma.guest.findMany({
    include: {
      images: true,
      message: true,
      event: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const event = await prisma.event.findFirst(
    {
      select: {
        coupleName: true,
      },
    }
  );

  return (
    <div className="container mx-auto p-6 relative">
      {/* Logout dugme gore desno */}
      <div className="sticky flex justify-end top-[46px] right-0 z-50">
        <AdminLogoutButton />
      </div>
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-block text-3xl font-extrabold tracking-wide bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400 bg-clip-text text-transparent underline underline-offset-8 decoration-[5px] decoration-yellow-400 drop-shadow-md animate-pulse">
            {event?.coupleName}
          </span>
          <span className="block text-lg font-medium text-gray-700 mt-2">
            uživajte u vašim sličicama
          </span>
          <span className="block w-24 h-1 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400 opacity-70 mt-2 mb-2"></span>
          <span className="block text-2xl">💍</span>
        </div>
      </div>



      <AdminDashboardTabs guests={guests} event={event} />
    </div>
  )
}
