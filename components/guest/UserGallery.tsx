"use client"

import { useState, useEffect } from "react"
import { ImageGallery } from "@/components/guest/ImageGallery"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface UserGalleryProps {
  initialImages: Image[]
  guestId: string
  eventSlug?: string
  className?: string
}

export function UserGallery({ initialImages, guestId, eventSlug: propEventSlug, className }: UserGalleryProps) {
  const [images, setImages] = useState<Image[]>(initialImages)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [eventSlug, setEventSlug] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Dohvati eventSlug iz URL-a, props-a ili iz localStorage
  useEffect(() => {
    // Prvo pokušaj dohvatiti iz URL-a
    const urlEventSlug = searchParams?.get('event')
    
    if (urlEventSlug) {
      setEventSlug(urlEventSlug)
      // Spremi u localStorage za kasnije korištenje
      localStorage.setItem('eventSlug', urlEventSlug)
    } else if (propEventSlug) {
      // Ako je eventSlug proslijeđen kao prop
      setEventSlug(propEventSlug)
      // Spremi u localStorage za kasnije korištenje
      localStorage.setItem('eventSlug', propEventSlug)
    } else {
      // Ako nema ni u URL-u ni u props-u, pokušaj dohvatiti iz localStorage
      const storedEventSlug = localStorage.getItem('eventSlug')
      if (storedEventSlug) {
        setEventSlug(storedEventSlug)
      }
    }
  }, [searchParams, propEventSlug])

  const handleDelete = async (imageId: string) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu sliku?")) {
      return
    }

    try {
      setIsDeleting(imageId)
      
      const response = await fetch(`/api/guest/images/delete?id=${imageId}&guestId=${guestId}`, {
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
    <div className={className}>
      <ImageGallery 
        images={images} 
        readOnly={false}
      />
      {images.length < 10 && (
        <Button
          variant="outline"
          onClick={() => {
            if (eventSlug) {
              router.push(`/guest/dashboard?event=${eventSlug}`)
            } else {
              // Ako nemamo eventSlug, pokušaj dohvatiti iz localStorage
              const storedEventSlug = localStorage.getItem('eventSlug')
              if (storedEventSlug) {
                router.push(`/guest/dashboard?event=${storedEventSlug}`)
              } else {
                // Ako ni to ne uspije, idi na dashboard bez parametra
                // (ovo će vjerojatno rezultirati greškom, ali barem imamo fallback)
                router.push('/guest/dashboard')
              }
            }
          }}
          className="mt-4"
        >
          Dodaj još slika
        </Button>
      )}
    </div>
  )
}
