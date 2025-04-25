import { redirect } from "next/navigation"
import { UserGallery } from "@/components/user-gallery"
import {GuestMessage} from "@/components/guest-message"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import LogoutButton from "./LogoutButton"

import { cookies } from "next/headers";

export default async function SuccessPage() {
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";

  if (!guestId) {
    redirect("/");
  }

  // Dohvatanje gosta sa slikama
  const guest = await getGuestById(guestId);

  if (!guest) {
    redirect("/");
  }

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: guestId }
  });

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
          <UserGallery
            initialImages={(guest?.images || []).map(img => ({
              ...img,
              storagePath: img.storagePath === null ? undefined : img.storagePath,
            }))}
            guestId={guestId}
          />
          <div className="mt-8">  
            <GuestMessage message={message} />
          </div>
          <div className="mt-8">
            <LogoutButton label="Odjavi se"/>
          </div>
        </div>
      </div>
    </div>
  );
}
