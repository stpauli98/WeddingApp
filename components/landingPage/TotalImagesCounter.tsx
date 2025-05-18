import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

// Keširana funkcija za dohvatanje ukupnog broja SVIH uploadovanih slika (Stats.totalUploadedImages)
export const getTotalImagesCount = unstable_cache(
  async () => {
    try {
      const stats = await prisma.stats.findUnique({ where: { id: 1 } });
      const totalImages = stats?.totalUploadedImages || 0;
      return totalImages;
    } catch (error) {
      return 0;
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
