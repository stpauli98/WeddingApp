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

interface UploadFormProps {
  guestId: string;
}

export function UploadForm({ guestId }: UploadFormProps) {
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

      // Provera da li imamo guestId
      if (!guestId) {
        throw new Error("Niste prijavljeni ili nedostaje ID gosta")
      }
      
      // Uvek šaljemo stvarni zahtev na backend sa guestId parametrom
      console.log("[UPLOAD-FORM] Šaljem podatke na /api/upload:", {
        message: values.message?.length || 0,
        images: values.images?.length || 0,
        guestId
      })

      const response = await fetch(`/api/upload?guestId=${guestId}`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      console.log("[UPLOAD-FORM] Odgovor od servera:", data)

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške")
      }

      // Preusmeravanje na stranicu za uspeh sa guestId parametrom
      console.log(`[UPLOAD-FORM] Preusmeravam na: /success?guestId=${guestId}`)
      
      // Koristimo setTimeout da osiguramo da se preusmeravanje desi nakon što se sve ostalo izvrši
      setTimeout(() => {
        window.location.href = `/success?guestId=${guestId}`
      }, 100)
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
        {/* Preview sekcija */}
        <div className="flex flex-wrap gap-4 mt-4">
          {(form.watch("images") || []).map((file: File, idx: number) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={idx} className="relative group border rounded p-1">
                <img
                  src={url}
                  alt={`preview-${idx}`}
                  className="w-24 h-24 object-cover rounded"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100"
                  onClick={() => {
                    const imgs = form.watch("images") || [];
                    form.setValue("images", imgs.filter((_: File, i: number) => i !== idx));
                  }}
                  aria-label="Ukloni sliku"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
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
      <Button type="submit" className="w-full" disabled={isLoading || (form.watch("images")?.length ?? 0) === 0}>
        {isLoading ? "Slanje..." : "Potvrdi upload"}
      </Button>
    </form>
  )
}

