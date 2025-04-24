import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { UserGallery } from "@/components/user-gallery"
import { GuestMessage } from "@/components/guest-message"
import { prisma } from "@/lib/prisma"

import LogoutButton from "./LogoutButton"

export default async function SuccessPage() {
  // Provera da li je korisnik prijavljen
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get("auth")

  if (!isAuthenticated) {
    redirect("/")
  }

  // Dohvatanje gosta sa slikama
  const guest = await prisma.guest.findUnique({
    where: { id: isAuthenticated.value },
    include: { images: true }
  })

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: isAuthenticated.value }
  })

  // Dohvatanje imena brudova iz baze
  const event = await prisma.event.findFirst({
    where: { id: guest?.eventId },
    select: { coupleName: true }
  });


  return (
    <div className="container max-w-md mx-auto px-4 py-8 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hvala!</h1>
        <p className="text-muted-foreground mt-4">
          Vaše slike i poruka su uspešno poslate. {event?.coupleName} će biti oduševljeni vašim iznenadjenjem!
        </p>
      </div>

      <div className="flex flex-col gap-4">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Vaše uploadovane slike</h2>
        <UserGallery initialImages={guest?.images || []} />
        <GuestMessage message={message} />
      </div>
        <LogoutButton label="Odjavi se"/>
      </div>
    </div>
  )
}
