"use client"

import React, { useState, useEffect } from 'react'
import { UploadForm } from '@/components/guest/Upload-Form'
import { UploadLimitReachedCelebration } from '@/components/guest/UploadLimitReachedCelebration'
import { ImageGallery } from '@/components/guest/ImageGallery'
import { useTranslation } from 'react-i18next'

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface DashboardClientProps {
  initialImages: Image[]
  guestId: string
  message?: string
  language?: string
}

import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";

export function DashboardClient({ initialImages, guestId, message, language = 'sr' }: DashboardClientProps) {
  const { t, i18n } = useTranslation();
  
  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  // Lokalno stanje za praćenje slika koje se može ažurirati nakon brisanja
  const [images, setImages] = useState<Image[]>(initialImages)

  // Snimi guestId u localStorage svaki put kad gost uđe na dashboard
  useEffect(() => {
    if (guestId) {
      localStorage.setItem("guestId", guestId);
    }
  }, [guestId]);

  // Funkcija koja se poziva kada se promijeni broj slika (npr. nakon brisanja)
  const handleImagesChange = (updatedImages: Image[]) => {
    setImages(updatedImages)
  }

  return (
    <>
      <AddToHomeScreenPrompt />
      <div className="mb-8">
        {/* Uvijek prikazujemo sekciju za slike, ali sa različitim sadržajem ovisno o broju slika */}
        <div key={`image-upload-section-${images.length}`}>
          {images.length >= 10 ? (
            // Ako korisnik ima 10 ili više slika, prikazujemo UploadLimitReachedCelebration
            <UploadLimitReachedCelebration 
              imagesCount={images.length}
              language={language}
            />
          ) : (
            // Inače prikazujemo UploadForm sa brojem postojećih slika
            <UploadForm 
              guestId={guestId} 
              message={message} 
              existingImagesCount={images.length}
              language={language}
            />
          )}
        </div>
      </div>
      
      <ImageGallery 
        images={images} 
        guestId={guestId}
        onImagesChange={handleImagesChange}
        language={language}
      />
    </>
  )
}
