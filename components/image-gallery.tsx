"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CldImage } from "next-cloudinary"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string
}

interface ImageGalleryProps {
  images: Image[]
  readOnly?: boolean
}

export function ImageGallery({ images, readOnly = false }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

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
        {images.map((image) => (
          <Card key={image.id} className="relative aspect-square overflow-hidden group bg-white border border-[#E2C275] shadow-lg rounded-xl transition-transform duration-200 hover:shadow-xl hover:scale-105">
            <div 
              className="w-full h-full cursor-pointer"
              onClick={() => openFullView(image.imageUrl)}
            >
              <CldImage
                src={image.imageUrl}
                width={400}
                height={400}
                crop="fill"
                alt="Slika gosta"
                className="w-full h-full object-cover p-2 rounded-lg"
                style={{ background: 'none' }}
              />
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
    className="mx-auto bg-white/90 border-4 border-[#E2C275] rounded-2xl shadow-2xl p-1 flex items-center justify-center relative"
    style={{ maxWidth: '96vw', maxHeight: '90vh' }}
  >
    <CldImage
      src={selectedImage}
      width={1200}
      height={900}
      crop="fit"
      alt="Slika gosta"
      className="w-full h-full object-contain transition-transform duration-200"
      style={{ width: '80vw', height: '80vh', background: 'none' }}
    />
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
