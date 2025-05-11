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
import { DashboardClient } from "@/components/guest/DashboardClient"

// Lokalni tip Image ako nije globalno dostupan
// Tip za slike koji je kompatibilan sa ImageGallery komponentom
interface DashboardImage {
  id: string;
  imageUrl: string;
  storagePath?: string;
}


export default async function DashboardPage(props: any) {
  const searchParams = props.searchParams as { [key: string]: string | string[] | undefined } | undefined;
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";
  
  // Ako nema guestId, preusmjeri na login
  if (!guestId) {
    redirect("/guest/login");
  }
  
  // Dohvati eventSlug iz query parametara (serverski način)
  let eventSlug = searchParams?.event;
  if (Array.isArray(eventSlug)) {
    eventSlug = eventSlug[0];
  }
  
  // Ako nema eventSlug u URL-u, preusmjeri na login stranicu
  if (!eventSlug) {
    redirect("/guest/login");
  }
  
  // Dohvati event na osnovu sluga
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  
  // Ako event ne postoji, preusmjeri na login
  if (!event) {
    redirect("/guest/login");
  }
  
  // Koristi eventId iz pronađenog eventa
  const eventId = event.id;
  
  // Proveri da li gost postoji za taj event
  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      eventId: eventId
    },
    include: {
      images: true,
      message: true
    }
  });
  
  // Ako gost ne postoji za taj event, to znači da gost nije autorizovan za ovaj event
  // U tom slučaju, kreiraj novog gosta za taj event sa istim ID-om
  if (!guest) {
    // Dohvati osnovne podatke o gostu
    const baseGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { firstName: true, lastName: true, email: true }
    });
    
    if (!baseGuest) {
      redirect("/guest/login");
    }
    
    // Kreiraj novog gosta za ovaj event
    await prisma.guest.create({
      data: {
        id: guestId, // Koristi isti ID
        eventId: eventId,
        firstName: baseGuest.firstName,
        lastName: baseGuest.lastName,
        email: baseGuest.email,
        verified: true
      }
    });
    
    // Osvježi stranicu da bi se prikazali podaci novog gosta
    redirect(`/guest/dashboard?event=${eventSlug}`);
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <WeddingInfo eventId={eventId} />
      
      {/* Koristimo DashboardClient komponentu koja će upravljati brojem slika i osigurati da se sve komponente ažuriraju kada se broj slika promijeni */}
      <DashboardClient 
        initialImages={(guest.images || []).map((img: { id: string; imageUrl: string; storagePath?: string | null }) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          storagePath: img.storagePath === null ? undefined : img.storagePath,
        }))} 
        guestId={guestId}
        message={guest.message?.text ?? ""}
      />
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
