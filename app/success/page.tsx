import { redirect } from "next/navigation"
import { UserGallery } from "@/components/user-gallery"
import { GuestMessage } from "@/components/guest-message"
import LogoutButton from "@/app/success/LogoutButton"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SuccessThankYouCard } from "@/components/success-thank-you-card"
import { UploadLimitReachedCelebration } from "@/components/upload-limit-reached-celebration"
import { cookies } from "next/headers";

function getSlikaPadez(n: number) {
  switch (n) {
    case 1:
      return "sliku"
    case 2:
    case 3:
    case 4:
      return "slike"
    default:
      return "slika"
  }
}

interface Image {
  id: string
  imageUrl: string
  storagePath?: string | null
}

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
      <SuccessThankYouCard coupleName={event?.coupleName} />

      <div className="flex flex-col gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow px-4 py-6 mb-8">
          <UserGallery
            initialImages={(guest?.images || []).map((img: Image) => ({
              ...img,
              storagePath: img.storagePath === null ? undefined : img.storagePath,
            }))}
            guestId={guestId}
          />
          {/* Prikaz koliko još slika može da se doda */}
          {guest.images && guest.images.length < 10 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Možete dodati još <span className="font-semibold">{10 - guest.images.length}</span> {getSlikaPadez(10 - guest.images.length)}.
            </div>
          )}
          <div className="mt-8">
            <GuestMessage message={message} />
          </div>
        </div>
        {guest.images && guest.images.length === 10 && (
          <div className="mb-2">
            <UploadLimitReachedCelebration />
          </div>
        )}
        <div className="mt-8">
          <LogoutButton label="Odjavi se"/>
        </div>
      </div>
    </div>
  );
}
