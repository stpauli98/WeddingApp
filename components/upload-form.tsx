"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/image-upload"

// Validacija: max 10 slika, max 500 karaktera poruka
const formSchema = z.object({
  message: z.string().max(500, { message: "Poruka ne može biti duža od 500 karaktera" }).optional(),
  images: z.array(z.instanceof(File)).max(10, { message: "Možete poslati najviše 10 slika" }).optional(),
})

export function UploadForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "", images: [] },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      const formData = new FormData()
      if (values.message) formData.append("message", values.message)
      if (values.images && values.images.length > 0) {
        for (const image of values.images) formData.append("images", image)
      }

      // Uvek šaljemo stvarni zahtev na backend
      console.log("[UPLOAD-FORM] Šaljem podatke na /api/upload:", {
        message: values.message?.length || 0,
        images: values.images?.length || 0
      })

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške")
      }

      // Preusmeravanje na stranicu za uspeh
      router.push("/success")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom slanja")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded shadow">
      <div>
        <label className="block font-medium mb-1">Slike (max 10)</label>
        <ImageUpload value={form.watch("images") || []} onChange={val => form.setValue("images", val)} maxFiles={10} />
        <p className="text-sm text-gray-500 mt-1">Možete poslati najviše 10 slika.</p>
      </div>
      <div>
        <label className="block font-medium mb-1">Poruka (opciono)</label>
        <Textarea
          placeholder="Napišite poruku ili čestitku mladencima..."
          rows={4}
          {...form.register("message")}
        />
        <p className="text-sm text-gray-500 mt-1">Maksimalno 500 karaktera</p>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Slanje..." : "Pošalji"}
      </Button>
    </form>
  )
}

