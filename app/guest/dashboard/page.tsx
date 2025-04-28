import { WeddingInfo } from "@/components/guest/WeddingInfo"
import { UploadForm } from "@/components/guest/Upload-Form"
import { LogoutButton } from "@/components/shared/LogoutButton"
import { ImageGallery } from "@/components/guest/ImageGallery"
import { getGuestById } from "@/lib/auth"
import { ImageSlotBar } from "@/components/guest/ImageSlotBar"
import { UploadLimitReachedCelebration } from "@/components/guest/UploadLimitReachedCelebration"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

// Lokalni tip Image ako nije globalno dostupan
// Tip za slike koji je kompatibilan sa ImageGallery komponentom
interface DashboardImage {
  id: string;
  imageUrl: string;
  storagePath?: string;
}

import { redirect } from "next/navigation"
import { cookies } from "next/headers";
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WeddingInfo } from "@/components/guest/WeddingInfo"
import { UploadForm } from "@/components/guest/Upload-Form"
import { LogoutButton } from "@/components/shared/LogoutButton"
import { ImageGallery } from "@/components/guest/ImageGallery"
import { ImageSlotBar } from "@/components/guest/ImageSlotBar"
import { UploadLimitReachedCelebration } from "@/components/guest/UploadLimitReachedCelebration"

export default async function DashboardPage({ searchParams }: { searchParams?: { event?: string } }) {
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";

  // Dohvati eventSlug iz query parametara (serverski način)
  const eventSlug = searchParams?.event;
  let eventId: string | undefined = undefined;

  if (eventSlug) {
    const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
    if (event) eventId = event.id;
  }

  if (!guestId) {
    redirect("/guest/login");
  }

  // Proveri da li gost postoji i da li je verifikovan za taj event
  const guest = await getGuestById(guestId, eventId);

  if (!guest) {
    redirect("/guest/login");
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <WeddingInfo />
      
      <div className="mb-8">
        {guest.images && guest.images.length >= 10 ? (
          <UploadLimitReachedCelebration />
        ) : (
          <>
            <ImageSlotBar current={guest.images?.length || 0} max={10} />
            <UploadForm guestId={guestId} message={guest.message?.text ?? ""} />
          </>
        )}
      </div>
      <ImageGallery images={(guest.images || []).map((img: { id: string; imageUrl: string; storagePath?: string | null }) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        storagePath: img.storagePath === null ? undefined : img.storagePath,
      }))} />
     {/* {guest.images && guest.images.length === 10 && (
        <div className="mt-8">
          <LogoutButton />
        </div>
      )} */}
      <div className="mt-8">
          <LogoutButton />
        </div>
    </div>
  )
}
