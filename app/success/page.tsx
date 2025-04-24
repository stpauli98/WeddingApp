import { redirect } from "next/navigation"
import { UserGallery } from "@/components/user-gallery"
import {GuestMessage} from "@/components/guest-message"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Ako je searchParams Promise, await-uj ga
  const params = await searchParams;
  // Dobavljanje guestId iz URL parametara
  const guestIdParam = params?.guestId;
  const guestId = typeof guestIdParam === 'string' ? guestIdParam : "";
  
  if (!guestId) {
    redirect("/")
  }
  
  // Dohvatanje gosta sa slikama
  const guest = await getGuestById(guestId)
  
  if (!guest) {
    redirect("/")
  }

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: guestId }
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
        <UserGallery initialImages={guest?.images || []} guestId={guestId} />
        <div className="mt-8">  
          <GuestMessage message={message} />
        </div>
      </div>
      </div>
    </div>
  )
}
