
import { redirect } from "next/navigation"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ClientSuccess from "./client-success"
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

// Pristup identičan ispravnom rješenju za dashboard/page.tsx
export default async function SuccessPage(props: any) {
  // U Next.js 15, searchParams mora biti awaited
  const resolvedProps = await Promise.resolve(props);
  const searchParams = resolvedProps.searchParams as { [key: string]: string | string[] | undefined } | undefined;
  
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";

  if (!guestId) {
    redirect("/guest/login");
  }

  // Dohvati eventSlug iz query parametara (sada je safe pristupiti searchParams)
  let eventSlug = searchParams?.event;
  if (Array.isArray(eventSlug)) {
    eventSlug = eventSlug[0];
  }


  // Dohvatanje gosta sa slikama
  const guest = await getGuestById(guestId);

  if (!guest) {
    redirect("/guest/login");
  }

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: guestId }
  });

  // Dohvatanje imena brudova iz baze i slug-a
  const event = await prisma.event.findFirst({
    where: { id: guest?.eventId },
    select: { coupleName: true, slug: true }
  });

  // Ako imamo eventSlug iz URL-a, koristimo ga, inače koristimo slug iz baze
  const finalEventSlug = eventSlug || event?.slug;

  return <ClientSuccess 
    guest={guest} 
    coupleName={event?.coupleName} 
    message={message ? { text: message.text } : undefined}
    eventSlug={finalEventSlug} 
  />;
}
