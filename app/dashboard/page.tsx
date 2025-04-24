import { WeddingInfo } from "@/components/wedding-info"
import { UploadForm } from "@/components/upload-form"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LogoutButton from "@/app/success/LogoutButton"
import { ImageGallery } from "@/components/image-gallery"
import { getGuestById } from "@/lib/auth"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Dobavljanje guestId iz URL parametara
  const guestIdParam = searchParams?.guestId
  const guestId = typeof guestIdParam === 'string' ? guestIdParam : ""
  
  if (!guestId) {
    console.log("[DASHBOARD] Nedostaje guestId u URL parametrima")
    redirect("/")
  }
  
  // Proveri da li gost postoji i da li je verifikovan
  const guest = await getGuestById(guestId)
  
  if (!guest) {
    console.log(`[DASHBOARD] Gost nije pronađen ili nije verifikovan: ${guestId}`)
    redirect("/")
  }
  
  console.log(`[DASHBOARD] Prijavljen gost: ${guest.firstName} ${guest.lastName}`)
  console.log(`[DASHBOARD] Broj slika gosta: ${guest.images?.length || 0}`)

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <WeddingInfo />
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Dodaj slike</h2>
        {guest.images && guest.images.length >= 10 ? (
          <p className="text-muted-foreground mb-4">
            Dostigli ste maksimalan broj slika (10/10). Hvala na vašem doprinosu!
          </p>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              Uploadovano {guest.images?.length || 0} od 10 dozvoljenih slika
            </p>
            <UploadForm guestId={guestId} />
          </>
        )}
        
      </div>
      <ImageGallery images={guest.images || []} />
      <LogoutButton label="Odjavi se" />
    </div>
  )
}
