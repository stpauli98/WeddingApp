import { prisma } from "@/lib/prisma"

export async function getTotalImagesCount() {
  try {
    const totalImages = await prisma.image.count()
    return totalImages
  } catch (error) {
    console.error("Greška pri dohvatanju ukupnog broja slika:", error)
    return 0
  }
}

export default async function TotalImagesCounter() {
  const totalImages = await getTotalImagesCount()
  
  // Formatiranje broja sa separatorima za hiljade
  const formattedCount = new Intl.NumberFormat('sr-RS').format(totalImages)
  
  return (
    <>
      {formattedCount}
    </>
  )
}
