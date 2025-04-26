"use client"

import { useState } from "react"
import { ImageGallery } from "@/components/guest/ImageGallery"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface UserGalleryProps {
  initialImages: Image[]
  guestId: string
}

export function UserGallery({ initialImages, guestId }: UserGalleryProps) {
  const [images, setImages] = useState<Image[]>(initialImages)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (imageId: string) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu sliku?")) {
      return
    }

    try {
      setIsDeleting(imageId)
      
      const response = await fetch(`/api/images/delete?id=${imageId}&guestId=${guestId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Greška pri brisanju slike")
      }

      // Ažuriraj lokalni state
      setImages(images.filter(img => img.id !== imageId))
      router.refresh()
    } catch (error) {
      console.error("Greška pri brisanju slike:", error)
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom brisanja slike")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div>
      <ImageGallery 
        images={images} 
        readOnly={false}
      />
      {images.length < 10 && (
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="mt-4"
        >
          Dodaj još slika
        </Button>
      )}
    </div>
  )
}
