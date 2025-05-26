"use client"

import React, { useState, useEffect } from "react";
import { X, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ImageWithSpinner from "@/components/shared/ImageWithSpinner"
import { useTranslation } from "react-i18next"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface ImageGalleryProps {
  images: Image[];
  guestId?: string; // Dodaj guestId za DELETE
  readOnly?: boolean;
  onImagesChange?: (images: Image[]) => void; // Callback za obavještavanje o promjeni broja slika
  language?: string; // Dodajemo prop za jezik
}


export function ImageGallery({ images: initialImages, guestId, readOnly = false, onImagesChange, language = 'sr' }: ImageGalleryProps) {
  const { t, i18n } = useTranslation();
  
  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  const [images, setImages] = useState<Image[]>(initialImages);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  // Funkcija za brisanje slike
  const handleDelete = async (imageId: string) => {
    if (!guestId) {
      return;
    }
    setDeletingId(imageId);
    setError(null);

    try {
      // Uvek refetch CSRF token pre DELETE
      const csrfRes = await fetch("/api/guest/images/delete");
      const { csrfToken } = await csrfRes.json();
  
      if (!csrfToken) {
        setError("Nije moguće dobiti CSRF token. Osvežite stranicu i pokušajte ponovo.");
        setDeletingId(null);
    
        return;
      }
      const url = `/api/guest/images/delete?id=${imageId}&guestId=${guestId}`;
  
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });
  
      let data = null;
      try {
        data = await res.json();
    
      } catch (jsonErr) {
    
      }
      if (!res.ok || !data?.success) {
        setError(data?.error || "Greška pri brisanju slike.");
    
      } else {
        // Filtriraj slike i ažuriraj lokalno stanje
        const updatedImages = images.filter(img => img.id !== imageId);
        setImages(updatedImages);
        
        // Obavijesti roditelja o promjeni broja slika ako postoji callback
        if (onImagesChange) {
          onImagesChange(updatedImages);
        }
        
        // Zatvori prikaz slike ako je trenutno otvorena slika koja je obrisana
        if (selectedImage && images.find(img => img.id === imageId)?.imageUrl === selectedImage) {
          setSelectedImage(null);
        }
    
      }
    } catch (e) {
      setError("Greška pri komunikaciji sa serverom.");
  
    } finally {
      setDeletingId(null);
  
    }
  };



  // Funkcija za otvaranje slike u punom prikazu
  const openFullView = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

  // Funkcija za zatvaranje punog prikaza
  const closeFullView = () => {
    setSelectedImage(null)
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {t('guest.imageGallery.noImages', 'Nema uploadovanih slika')}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="relative aspect-square overflow-hidden group bg-white border border-[hsl(var(--lp-accent))] shadow-lg rounded-xl transition-transform duration-200 hover:shadow-xl hover:scale-105">
            {/* Dugme za brisanje slike */}
            {!readOnly && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-20 bg-white/90 border border-[hsl(var(--lp-accent))] shadow-md rounded-full p-1 hover:bg-[hsl(var(--lp-accent))]/20 hover:scale-110 transition-all duration-150"
                onClick={e => { e.stopPropagation(); handleDelete(image.id); }}
                disabled={deletingId === image.id}
                aria-label={t('guest.imageGallery.deleteImage', 'Obriši sliku')}
              >
                {deletingId === image.id ? (
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                ) : (
                  <Trash className="h-3 w-3 text-[hsl(var(--lp-accent-foreground))] group-hover:text-[hsl(var(--lp-destructive))] transition-colors duration-150" />
                )}
              </Button>
            )}
            <div 
              className="w-full h-full cursor-pointer"
              onClick={() => openFullView(image.imageUrl)}
            >
              {image.imageUrl && typeof image.imageUrl === 'string' ? (
                <ImageWithSpinner
                  src={image.imageUrl}
                  width={400}
                  height={400}
                  crop="fill"
                  alt={t('guest.imageGallery.guestImage', 'Slika gosta')}
                  className="p-2"
                  rounded={true}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-[hsl(var(--lp-destructive))]/10 text-[hsl(var(--lp-destructive))] text-center text-sm p-4">
                  {t('guest.imageGallery.imageError', 'Greška: Slika nije dostupna ili nije validan URL')}
                </div>
              )}
            </div>
          </Card>
        ))}

      </div>

      {/* Modal za prikaz slike u punoj veličini */}
      {selectedImage && (
  <div 
    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    onClick={closeFullView}
  >
    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <div
        className="mx-auto bg-white/90 border-4 border-[hsl(var(--lp-accent))] rounded-2xl shadow-2xl p-1 flex items-center justify-center relative"
        style={{ maxWidth: '96vw', maxHeight: '90vh' }}
      >
        {selectedImage && typeof selectedImage === 'string' ? (
          <ImageWithSpinner
            src={selectedImage}
            width={1200}
            height={900}
            crop="fit"
            alt="Slika gosta"
            className="w-full h-full object-contain transition-transform duration-200"
            style={{ width: '80vw', height: '80vh' }}
            rounded={true}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-[hsl(var(--lp-destructive))]/10 text-[hsl(var(--lp-destructive))] text-center text-sm p-4">
            {t('guest.imageGallery.imageError', 'Greška: Slika nije dostupna ili nije validan URL')}
          </div>
        )}
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={closeFullView}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
)}
    </>
  )
}
