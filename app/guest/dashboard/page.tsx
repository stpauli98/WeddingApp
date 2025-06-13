import { WeddingInfo } from "@/components/guest/WeddingInfo"
import { LogoutButton } from "@/components/shared/LogoutButton"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/guest/DashboardClient"
import { changeLanguage } from "@/lib/i18n/i18n"

// Lokalni tip Image ako nije globalno dostupan
// Tip za slike koji je kompatibilan sa ImageGallery komponentom
interface DashboardImage {
  id: string;
  imageUrl: string;
  storagePath?: string;
}


// Umjesto definiranja vlastitih tipova, koristimo any za sada
// Next.js 15 ima drugačiju strukturu tipova za page komponente

export default async function DashboardPage(props: any) {
  const searchParams = await props.searchParams;
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";
  
  // Dohvati jezik iz kolačića
  const languageCookie = cookieStore.get("i18nextLng");
  const cookieLanguage = languageCookie?.value || "sr";
  
  // Dohvati trenutni URL iz headers-a
  let urlLanguage = null;
  
  try {
    // U Next.js 15, headers() vraća Promise
    const headersList = await headers();
    const referer = headersList.get('referer') || headersList.get('x-url') || '';
    
    if (referer) {
      const url = new URL(referer);
      const pathSegments = url.pathname.split('/');
      if (pathSegments.length > 1 && ['sr', 'en'].includes(pathSegments[1])) {
        urlLanguage = pathSegments[1];
      }
    }
  } catch (error) {
    console.error('Greška pri parsiranju URL-a:', error);
  }
  
  // Koristi jezik iz URL-a ako postoji, inače koristi jezik iz kolačića
  const language = urlLanguage || cookieLanguage;
  
  // Ako nema guestId, preusmjeri na login s odgovarajućim jezikom
  if (!guestId) {
    redirect(`/${language}/guest/login`);
  }
  
  // Dohvati eventSlug iz query parametara (serverski način)
  let eventSlug = searchParams.event;
  if (Array.isArray(eventSlug)) {
    eventSlug = eventSlug[0];
  }
  
  // Ako nema eventSlug u URL-u, preusmjeri na login stranicu s odgovarajućim jezikom
  if (!eventSlug) {
    redirect(`/${language}/guest/login`);
  }
  
  // Dohvati event na osnovu sluga, uključujući i jezik admina
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      admin: {
        select: {
          language: true
        }
      }
    }
  });
  
  // Ako event ne postoji, preusmjeri na login
  if (!event) {
    redirect(`/${language}/guest/login`);
  }
  
  // Dohvati jezik admina koji je kreirao event (ili defaultni ako nije postavljen)
  const eventLanguage = event.admin?.language || "sr";
  
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
      redirect(`/${language}/guest/login`);
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
    
    // Osvježi stranicu da bi se prikazali podaci novog gosta, koristi jezik eventa
    redirect(`/${eventLanguage}/guest/dashboard?event=${eventSlug}&lang=${eventLanguage}`);
  }

  return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <WeddingInfo eventId={eventId} language={urlLanguage || language || eventLanguage} />
      
      {/* Koristimo DashboardClient komponentu koja će upravljati brojem slika i osigurati da se sve komponente ažuriraju kada se broj slika promijeni */}
        <DashboardClient 
          initialImages={(guest.images || []).map((img: { id: string; imageUrl: string; storagePath?: string | null }) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            storagePath: img.storagePath === null ? undefined : img.storagePath,
          }))} 
          guestId={guestId}
          message={guest.message?.text ?? ""}
          language={urlLanguage || language || eventLanguage}
        />
        <div className="mt-8">
          <LogoutButton 
            language={urlLanguage || language || eventLanguage} 
            eventSlug={eventSlug}
          />
        </div>
      </div>
    )
}
