"use client"

import React, { useState } from "react";
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/guest/ImageUpload"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

// Validacija: max 10 slika, max 500 karaktera poruka
const formSchema = z.object({
  message: z.string().max(500, { message: "Poruka ne može biti duža od 500 karaktera" }).optional(),
  images: z.array(z.instanceof(File)).max(10, { message: "Možete poslati najviše 10 slika" }).optional(),
})

interface UploadFormProps {
  guestId: string;
  message?: string;
}

export function UploadForm({ guestId, message }: UploadFormProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: message ?? "", images: [] },
  })

  // Povuci CSRF token na mount
  React.useEffect(() => {
    fetch("/api/guest/upload")
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null)); // Token je sada csrf_token_guest_upload u kolačiću
  }, []);

  // Funkcija za resize slike pomoću canvas-a
  async function resizeImage(file: File, maxWidth = 1280): Promise<File> {
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

        // Prvo pokušaj toBlob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              resolve(newFile);
            } else {
              // Fallback na toDataURL ako toBlob ne uspe
              try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                // Pretvori base64 u Blob ručno
                const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)![1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--) u8arr[n] = bstr.charCodeAt(n);
                const fallbackBlob = new Blob([u8arr], { type: mime });
                const newFile = new File([fallbackBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: mime });
                resolve(newFile);
              } catch (e) {
                reject('Neuspešan fallback za canvas.toDataURL');
              }
            }
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

      const response = await fetch(`/api/guest/upload?guestId=${guestId}`, {
        method: "POST",
        body: formData,
        headers: {
          "x-csrf-token": csrfToken || "",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške");
      }
      
      setTimeout(() => {
        window.location.href = "/guest/success";
      }, 100);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom slanja");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="relative max-w-xl mx-auto my-8">
      {/* Loading overlay */}
      {isLoading && (
  <div
    className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center rounded-xl shadow-lg"
    aria-live="assertive"
    aria-label="Slanje u toku"
  >
    <div className="flex flex-col items-center gap-3">
      {/* Custom spinner */}
      <svg className="animate-spin h-10 w-10 text-[#E2C275] drop-shadow-lg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span className="text-[#E2C275] text-lg font-bold tracking-wide animate-pulse">
        Slika se šalje...
      </span>
      <span className="text-sm text-gray-500 font-medium">
        Molimo sačekajte, upload može potrajati par sekundi.
      </span>
      {/* Dots animation */}
      <span className="flex gap-1 mt-2">
        <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
        <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
        <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
      </span>
    </div>
  </div>
)}
      <CardHeader>
        <CardTitle>Dodaj slike</CardTitle>
        <CardDescription>Maksimalno 10 slika i poruka mladencima</CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        aria-busy={isLoading}
        aria-describedby="upload-instructions"
      >
        <CardContent className="space-y-6">
          <div>
            <label className="block font-medium mb-1" htmlFor="images-upload">Slike (max 10)</label>
            <span id="upload-instructions" className="sr-only">Prvo izaberite slike, zatim kliknite na dugme Potvrdi upload. Sve akcije su dostupne tastaturom. Status slanja će biti automatski najavljen.</span>
            <ImageUpload
              value={form.watch("images") || []}
              onChange={val => form.setValue("images", val)}
              maxFiles={10}
              inputProps={{
                id: "images-upload",
                'aria-label': "Izaberite slike za upload (maksimalno 10)",
              }}
            />
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
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            aria-label="Pošalji slike i poruku mladencima"
            disabled={isLoading || (form.watch("images")?.length ?? 0) === 0}
          >
            {isLoading ? "Slanje..." : "Potvrdi upload"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

