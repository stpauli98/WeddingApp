"use client"

import React, { useState } from "react";
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ImageWithSpinner from "@/components/shared/ImageWithSpinner"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface ImageGalleryProps {
  images: Image[];
  guestId?: string; // Dodaj guestId za DELETE
  readOnly?: boolean;
}


export function ImageGallery({ images: initialImages, guestId, readOnly = false }: ImageGalleryProps) {
  const [images, setImages] = useState<Image[]>(initialImages);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  // Funkcija za brisanje slike
  const handleDelete = async (imageId: string) => {
    if (!guestId) return;
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
      const res = await fetch(`/api/guest/images/delete?id=${imageId}&guestId=${guestId}`, {
        method: "DELETE",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Greška pri brisanju slike.");
      } else {
        setImages((imgs) => imgs.filter(img => img.id !== imageId));
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
        Nema uploadovanih slika
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((image) => {
  
  return (
    <Card key={image.id} className="relative aspect-square overflow-hidden group bg-white border border-[#E2C275] shadow-lg rounded-xl transition-transform duration-200 hover:shadow-xl hover:scale-105">
      {/* Dugme za brisanje slike */}
      {!readOnly && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 opacity-80 hover:opacity-100"
          onClick={e => { e.stopPropagation(); handleDelete(image.id); }}
          disabled={deletingId === image.id}
          aria-label="Obriši sliku"
        >
          {deletingId === image.id ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <X className="h-4 w-4" />
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
            alt="Slika gosta"
            className="p-2"
            rounded={true}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-red-100 text-red-500 text-center text-sm p-4">
            Greška: Slika nije dostupna ili nije validan URL
          </div>
        )}
      </div>
    </Card>
  );
})}
      </div>

      {/* Modal za prikaz slike u punoj veličini */}
      {selectedImage && (
  <div 
    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    onClick={closeFullView}
  >
    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <div
        className="mx-auto bg-white/90 border-4 border-[#E2C275] rounded-2xl shadow-2xl p-1 flex items-center justify-center relative"
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
          <div className="flex items-center justify-center w-full h-full bg-red-100 text-red-500 text-center text-sm p-4">
            Greška: Slika nije dostupna ili nije validan URL
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
