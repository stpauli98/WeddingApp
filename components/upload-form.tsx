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
  const [modalImageIdx, setModalImageIdx] = useState<number | null>(null)
  const router = useRouter()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "", images: [] },
  })

  // Funkcija za resize slike pomoću canvas-a
  async function resizeImage(file: File, maxWidth = 2048): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas not supported");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("Greška pri konverziji slike");
            // Kreiramo novi File objekat sa .jpg ekstenzijom
            const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            resolve(newFile);
          },
          'image/jpeg',
          0.92
        );
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const formData = new FormData();
      if (values.message) formData.append("message", values.message);
      if (values.images && values.images.length > 0) {
        // Sekvencijalni resize slika zbog memory limita na mobilnim browserima
        const resizedImages: File[] = [];
        for (let i = 0; i < values.images.length; i++) {
          const img = values.images[i];
          try {
            const resized = await resizeImage(img);
            console.log(`[Resize] ${i+1}/${values.images.length}:`, resized, resized instanceof File, resized?.name, resized?.type);
            if (!(resized instanceof File)) {
              alert("Došlo je do greške pri obradi slike. Pokušajte ponovo ili koristite drugi browser.");
              throw new Error("Resize nije vratio File objekat");
            }
            resizedImages.push(resized);
          } catch (e) {
            alert("Neka slika nije mogla biti obrađena. Probajte ponovo ili smanjite broj slika.");
            throw e;
          }
        }
        for (const image of resizedImages) formData.append("images", image);
      }

      // Provera da li imamo guestId
      if (!guestId) {
        throw new Error("Niste prijavljeni ili nedostaje ID gosta");
      }

      // Uvek šaljemo stvarni zahtev na backend sa guestId parametrom
      console.log("[UPLOAD-FORM] Šaljem podatke na /api/upload:", {
        message: values.message?.length || 0,
        images: values.images?.length || 0,
        guestId
      });

      const response = await fetch(`/api/upload?guestId=${guestId}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("[UPLOAD-FORM] Odgovor od servera:", data);

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške");
      }

      // Preusmeravanje na stranicu za uspeh sa guestId parametrom
      console.log(`[UPLOAD-FORM] Preusmeravam na: /success?guestId=${guestId}`);
      setTimeout(() => {
        window.location.href = `/success?guestId=${guestId}`;
      }, 100);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom slanja");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 z-20 flex flex-col items-center justify-center rounded">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-blue-600 font-semibold">Slika se šalje...</span>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded shadow">
        <div>
        <label className="block font-medium mb-1">Slike (max 10)</label>
        <ImageUpload value={form.watch("images") || []} onChange={val => form.setValue("images", val)} maxFiles={10} />
        {/* Grid prikaz slika sa klikom za modal i brisanjem */}
       
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
    </div>
  )
}

