"use client"

import { useState, useEffect } from "react"
import { ImageGallery } from "@/components/guest/ImageGallery"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

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
  language?: string
}

export function UserGallery({ initialImages, guestId, eventSlug: propEventSlug, className, language = 'sr' }: UserGalleryProps) {
  const { t, i18n } = useTranslation();
  const [images] = useState<Image[]>(initialImages)
  const [eventSlug, setEventSlug] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  
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

  return (
    <div className={className}>
      <ImageGallery 
        images={images} 
        readOnly={true}
      />
      {images.length < 10 && (
        <Button
          variant="outline"
          onClick={() => {
            if (eventSlug) {
              router.push(`/${language}/guest/dashboard?event=${eventSlug}`)
            } else {
              // Ako nemamo eventSlug, pokušaj dohvatiti iz localStorage
              const storedEventSlug = localStorage.getItem('eventSlug')
              if (storedEventSlug) {
                router.push(`/${language}/guest/dashboard?event=${storedEventSlug}`)
              } else {
                // Ako ni to ne uspije, idi na dashboard bez parametra
                // (ovo će vjerojatno rezultirati greškom, ali barem imamo fallback)
                router.push(`/${language}/guest/dashboard`)
              }
            }
          }}
          className="mt-4 border-[hsl(var(--lp-primary))]/50 text-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-primary))]/10 hover:text-[hsl(var(--lp-primary-hover))]"
        >
          {t('guest.userGallery.addMorePhotos', 'Dodaj još slika')}
        </Button>
      )}
    </div>
  )
}
