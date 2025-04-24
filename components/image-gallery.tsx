"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Image {
  id: string
  imageUrl: string
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
          <Card key={image.id} className="relative aspect-square overflow-hidden group">
            <div 
              className="w-full h-full cursor-pointer"
              onClick={() => openFullView(image.imageUrl)}
            >
              <div 
                className="w-full h-full bg-cover bg-center" 
                style={{ backgroundImage: `url(${image.imageUrl})` }}
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
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <div 
              className="w-full h-full bg-contain bg-center bg-no-repeat" 
              style={{ backgroundImage: `url(${selectedImage})` }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={closeFullView}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
