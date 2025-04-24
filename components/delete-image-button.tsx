"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface DeleteImageButtonProps {
  imageId: string
  onSuccess?: () => void
}

export function DeleteImageButton({ imageId, onSuccess }: DeleteImageButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu sliku?")) {
      return
    }

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/images/delete?id=${imageId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Greška pri brisanju slike")
      }

      // Osvežavanje stranice ili poziv callback funkcije
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Greška pri brisanju slike:", error)
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom brisanja slike")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "Brisanje..." : "Obriši sliku"}
    </Button>
  )
}
