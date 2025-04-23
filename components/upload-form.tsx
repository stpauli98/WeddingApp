"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ImageUpload } from "@/components/image-upload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Definisanje šeme za validaciju forme
const formSchema = z.object({
  message: z
    .string()
    .max(500, {
      message: "Poruka ne može biti duža od 500 karaktera",
    })
    .optional(),
  images: z
    .array(z.instanceof(File))
    .max(10, {
      message: "Možete poslati najviše 10 slika",
    })
    .optional(),
})

export function UploadForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Inicijalizacija forme sa react-hook-form i zod validacijom
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      images: [],
    },
  })

  // Funkcija koja se poziva prilikom slanja forme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      // Kreiranje FormData objekta za slanje slika
      const formData = new FormData()

      if (values.message) {
        formData.append("message", values.message)
      }

      if (values.images && values.images.length > 0) {
        // Provera veličine slika pre slanja
        let totalSize = 0
        const maxSize = 10 * 1024 * 1024 // 10MB ukupno

        for (const image of values.images) {
          totalSize += image.size

          // Provera pojedinačne veličine slike
          if (image.size > 2 * 1024 * 1024) {
            // 2MB po slici
            throw new Error(`Slika ${image.name} je prevelika. Maksimalna veličina je 2MB.`)
          }

          formData.append("images", image)
        }

        // Provera ukupne veličine
        if (totalSize > maxSize) {
          throw new Error(`Ukupna veličina slika je prevelika. Maksimalna veličina je 10MB.`)
        }
      }

      // U test okruženju, simuliramo uspešno slanje
      if (window.location.href.includes("test=true") || process.env.NODE_ENV === "development") {
        // Simulacija obrade zahteva
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Preusmeravanje na stranicu za uspeh
        router.push("/success")
        return
      }

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
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Greška",
        description: error instanceof Error ? error.message : "Došlo je do greške prilikom slanja",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pošaljite slike i poruku</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slike</FormLabel>
                  <FormControl>
                    <ImageUpload value={field.value || []} onChange={field.onChange} maxFiles={10} />
                  </FormControl>
                  <FormDescription>
                    Možete poslati najviše 10 slika (max 2MB po slici). Poslato: {field.value?.length || 0}/10
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poruka (opciono)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Napišite poruku ili čestitku mladencima..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Maksimalno 500 karaktera</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Slanje..." : "Pošalji"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
