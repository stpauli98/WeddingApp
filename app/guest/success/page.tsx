
import { redirect } from "next/navigation"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ClientSuccess from "./client-success"
import { cookies, headers } from "next/headers";

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

// Pristup identičan ispravnom rješenju za dashboard/page.tsx
export default async function SuccessPage(props: any) {
  // U Next.js 15, searchParams mora biti awaited
  const searchParams = await props.searchParams;
  
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";
  
  // Dohvati jezik iz kolačića
  const languageCookie = cookieStore.get("i18nextLng");
  const cookieLanguage = languageCookie?.value || "sr";
  
  // Dohvati trenutni URL iz headers-a za određivanje jezičnog prefiksa
  let urlLanguage = null;
  try {
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

  if (!guestId) {
    redirect(`/${language}/guest/login`);
  }

  // Dohvati eventSlug iz query parametara (sada je safe pristupiti searchParams)
  let eventSlug = searchParams.event;
  if (Array.isArray(eventSlug)) {
    eventSlug = eventSlug[0];
  }


  // Dohvatanje gosta sa slikama
  const guest = await getGuestById(guestId);

  if (!guest) {
    redirect(`/${language}/guest/login`);
  }

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: guestId }
  });

  // Dohvatanje imena brudova iz baze, slug-a i jezika admina
  const event = await prisma.event.findFirst({
    where: { id: guest?.eventId },
    select: { 
      coupleName: true, 
      slug: true,
      admin: {
        select: {
          language: true
        }
      }
    }
  });
  
  // Dohvati jezik admina koji je kreirao event (ili defaultni ako nije postavljen)
  const eventLanguage = event?.admin?.language || "sr";

  // Ako imamo eventSlug iz URL-a, koristimo ga, inače koristimo slug iz baze
  const finalEventSlug = eventSlug || event?.slug;

  return <ClientSuccess 
    guest={guest} 
    coupleName={event?.coupleName} 
    message={message ? { text: message.text } : undefined}
    eventSlug={finalEventSlug}
    language={urlLanguage || language || eventLanguage}
  />;
}
