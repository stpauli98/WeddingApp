import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, MessageSquare, User } from "lucide-react"
import { prisma } from '@/lib/prisma'
import AdminLogoutButton from "@/components/admin/AdminLogoutButton"

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

  return (
    <div className="container mx-auto p-6 relative">
      {/* Logout dugme gore desno */}
      <div className="absolute right-6 top-6">
        <AdminLogoutButton />
      </div>
      <h1 className="mb-8 text-3xl font-bold">Admin Dashboard</h1>



      <Tabs defaultValue="guests" className="mb-8">
        <TabsList>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="guests">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {guests.map((guest) => (
              <Card key={guest.id} className="overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={guest.images.length > 0 ? guest.images[0].imageUrl : "/placeholder.svg"}
                    alt={`Slika gosta ${guest.firstName} ${guest.lastName}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {guest.firstName} {guest.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-start gap-2">
                    <MessageSquare className="mt-1 h-5 w-5 flex-shrink-0 text-gray-500" />
                    <p className="line-clamp-3 text-sm text-gray-600">
                      {guest.message && guest.message.text ? guest.message.text : <span className="italic text-gray-400">Nema poruke</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">{guest.images.length} slika</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Prijavljen: {guest.email} • {guest.createdAt.toLocaleString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/admin/dashboard/guest/${guest.id}`}>Detalji gosta</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-xl font-medium">Analytics Dashboard</h3>
            <p className="mt-2 text-gray-500">Analytics content will be displayed here.</p>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-xl font-medium">Settings</h3>
            <p className="mt-2 text-gray-500">Settings content will be displayed here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
