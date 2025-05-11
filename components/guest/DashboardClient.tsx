"use client"

import React, { useState } from 'react'
import { UploadForm } from '@/components/guest/Upload-Form'
import { UploadLimitReachedCelebration } from '@/components/guest/UploadLimitReachedCelebration'
import { ImageGallery } from '@/components/guest/ImageGallery'

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface DashboardClientProps {
  initialImages: Image[]
  guestId: string
  message?: string
}

export function DashboardClient({ initialImages, guestId, message }: DashboardClientProps) {
  // Lokalno stanje za praćenje slika koje se može ažurirati nakon brisanja
  const [images, setImages] = useState<Image[]>(initialImages)

  // Funkcija koja se poziva kada se promijeni broj slika (npr. nakon brisanja)
  const handleImagesChange = (updatedImages: Image[]) => {
    setImages(updatedImages)
  }

  return (
    <>
      <div className="mb-8">
        {/* Uvijek prikazujemo sekciju za slike, ali sa različitim sadržajem ovisno o broju slika */}
        <div key={`image-upload-section-${images.length}`}>
          {images.length >= 10 ? (
            // Ako korisnik ima 10 ili više slika, prikazujemo UploadLimitReachedCelebration
            <UploadLimitReachedCelebration 
              imagesCount={images.length} 
            />
          ) : (
            // Inače prikazujemo UploadForm sa brojem postojećih slika
            <UploadForm 
              guestId={guestId} 
              message={message} 
              existingImagesCount={images.length} 
            />
          )}
        </div>
      </div>
      
      <ImageGallery 
        images={images} 
        guestId={guestId}
        onImagesChange={handleImagesChange}
      />
    </>
  )
}
