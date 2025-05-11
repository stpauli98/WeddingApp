import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

// Keširana funkcija za dohvatanje ukupnog broja slika sa revalidacijom svakih 60 sekundi
export const getTotalImagesCount = unstable_cache(
  async () => {
    try {
      // Koristimo Prisma za dohvatanje ukupnog broja slika
      const totalImages = await prisma.image.count()
      console.log(`[TotalImagesCounter] Dohvaćeno ${totalImages} slika iz baze`)
      return totalImages
    } catch (error) {
      console.error("Greška pri dohvatanju ukupnog broja slika:", error)
      return 0
    }
  },
  ["total-images-count"], // Ključ za keširanje
  { revalidate: 60 } // Revalidacija svakih 60 sekundi
)

export default async function TotalImagesCounter() {
  // Dohvati ukupan broj slika iz keširane funkcije
  const totalImages = await getTotalImagesCount()
  
  // Formatiranje broja sa separatorima za hiljade
  const formattedCount = new Intl.NumberFormat('sr-RS').format(totalImages)
  
  return (
    <>
      {formattedCount}
    </>
  )
}
