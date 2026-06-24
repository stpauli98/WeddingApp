import { WeddingInfo } from "@/components/guest/WeddingInfo"
import { LogoutButton } from "@/components/shared/LogoutButton"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/guest/DashboardClient"
import { getAuthenticatedGuest } from "@/lib/guest-auth"
import { getVideoLimit } from "@/lib/video-config"

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

export default async function DashboardPage(props: any) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  
  // Dohvati jezik iz kolačića
  const cookieLanguage = cookieStore.get("i18nextLng")?.value || "sr";
  
  // Dohvati jezik iz URL-a
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
  
  const language = urlLanguage || cookieLanguage;
  
  // Validiraj guest sesiju iz baze (opaque token, ne UUID)
  const guest = await getAuthenticatedGuest();
  if (!guest) {
    redirect(`/${language}/guest/login`);
  }
  
  // Dohvati eventSlug iz query parametara
  let eventSlug = searchParams.event;
  if (Array.isArray(eventSlug)) {
    eventSlug = eventSlug[0];
  }
  
  if (!eventSlug) {
    redirect(`/${language}/guest/login`);
  }
  
  // Dohvati event
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      admin: { select: { language: true } }
    },
  });
  
  if (!event) {
    redirect(`/${language}/guest/login`);
  }

  // Provjeri da gost pripada ovom eventu
  if (guest.eventId !== event.id) {
    redirect(`/${language}/guest/login`);
  }
  
  const eventLanguage = event.admin?.language || "sr";

  // Dohvati slike i poruku za ovog gosta
  const guestWithData = await prisma.guest.findUnique({
    where: { id: guest.id },
    include: { images: true, videos: true, message: true }
  });

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <WeddingInfo eventId={event.id} language={urlLanguage || language || eventLanguage} />
      
      <DashboardClient
        initialImages={(guestWithData?.images ?? []).map((i: { id: string; imageUrl: string; storagePath?: string | null; createdAt: Date }) => ({
          id: i.id,
          imageUrl: i.imageUrl,
          storagePath: i.storagePath ?? undefined,
          createdAt: i.createdAt.toISOString(),
        }))}
        guestId={guest.id}
        message={guestWithData?.message?.text ?? ""}
        language={urlLanguage || language || eventLanguage}
        imageLimit={event.imageLimit || 10}
        tier={event.pricingTier}
        initialVideos={(guestWithData?.videos ?? []).map((v: { id: string; videoUrl: string; posterUrl: string; durationSec: number; createdAt: Date }) => ({
          id: v.id,
          videoUrl: v.videoUrl,
          posterUrl: v.posterUrl,
          durationSec: v.durationSec,
          createdAt: v.createdAt.toISOString(),
        }))}
        videoLimit={getVideoLimit(event.pricingTier)}
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
