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
import { CheckCircle, Loader2 } from "lucide-react"

// Validacija: max 10 slika, max 500 karaktera poruka
const formSchema = z.object({
  message: z.string().max(500, { message: "Poruka ne može biti duža od 500 karaktera" }).optional(),
  images: z.array(z.instanceof(File)).max(10, { message: "Možete poslati najviše 10 slika" }).optional(),
})

// Tip za status uploada slike
type ImageUploadStatus = {
  file: File;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
}

interface UploadFormProps {
  guestId: string;
  message?: string;
}

export function UploadForm({ guestId, message }: UploadFormProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<ImageUploadStatus[]>([])
  const [showUploadStatus, setShowUploadStatus] = useState(false)
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
      // Provera da li imamo guestId
      if (!guestId) {
        throw new Error("Niste prijavljeni ili nedostaje ID gosta");
      }

      if (!values.images || values.images.length === 0) {
        throw new Error("Molimo odaberite bar jednu sliku");
      }

      setIsLoading(true);
      setShowUploadStatus(true);
      
      // Inicijalizacija statusa za svaku sliku
      const initialStatuses: ImageUploadStatus[] = values.images.map(file => {
        return {
          file,
          status: 'waiting',
          progress: 0,
          preview: URL.createObjectURL(file)
        };
      });
      setUploadStatuses(initialStatuses);

      // Prvo pošalji poruku ako postoji
      if (values.message) {
        const messageFormData = new FormData();
        messageFormData.append("message", values.message);
        
        const messageResponse = await fetch(`/api/guest/upload?guestId=${guestId}`, {
          method: "POST",
          body: messageFormData,
          headers: {
            "x-csrf-token": csrfToken || "",
          },
        });
        
        if (!messageResponse.ok) {
          const data = await messageResponse.json();
          throw new Error(data.error || "Došlo je do greške prilikom slanja poruke");
        }
      }

      // Sekvencijalno uploaduj svaku sliku pojedinačno
      let uploadedCount = 0;
      for (let i = 0; i < values.images.length; i++) {
        try {
          // Ažuriraj status da je slika u procesu uploada
          setUploadStatuses(prev => prev.map((status, idx) => 
            idx === i ? { ...status, status: 'uploading', progress: 10 } : status
          ));
          
          // Resize slike
          const img = values.images[i];
          const resizedImg = await resizeImage(img);
          
          // Ažuriraj progress nakon resize-a
          setUploadStatuses(prev => prev.map((status, idx) => 
            idx === i ? { ...status, progress: 30 } : status
          ));
          
          // Kreiraj formData za pojedinačnu sliku
          const imageFormData = new FormData();
          imageFormData.append("images", resizedImg);
          
          // Ažuriraj progress prije uploada
          setUploadStatuses(prev => prev.map((status, idx) => 
            idx === i ? { ...status, progress: 50 } : status
          ));
          
          // Upload slike
          const response = await fetch(`/api/guest/upload?guestId=${guestId}`, {
            method: "POST",
            body: imageFormData,
            headers: {
              "x-csrf-token": csrfToken || "",
            },
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || "Došlo je do greške");
          }
          
          // Ažuriraj status da je slika uspješno uploadovana
          setUploadStatuses(prev => prev.map((status, idx) => 
            idx === i ? { ...status, status: 'success', progress: 100 } : status
          ));
          
          uploadedCount++;
        } catch (error) {
          // Ažuriraj status da je došlo do greške pri uploadu slike
          setUploadStatuses(prev => prev.map((status, idx) => 
            idx === i ? { 
              ...status, 
              status: 'error', 
              error: error instanceof Error ? error.message : "Greška pri uploadu" 
            } : status
          ));
        }
      }
      
      // Ako su sve slike uspješno uploadovane, preusmjeri na success stranicu
      if (uploadedCount === values.images.length) {
        setTimeout(() => {
          window.location.href = "/guest/success";
        }, 1500);
      } else {
        // Ako neke slike nisu uploadovane, prikaži poruku o djelimičnom uspjehu
        alert(`Uspješno je uploadovano ${uploadedCount} od ${values.images.length} slika.`);
        setIsLoading(false);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom slanja");
      setIsLoading(false);
      setShowUploadStatus(false);
    }
  }

  return (
    <Card className="relative max-w-xl mx-auto my-8">
      {/* Upload status overlay */}
      {showUploadStatus && (
        <div
          className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-start p-6 rounded-xl shadow-lg overflow-y-auto"
          aria-live="assertive"
          aria-label="Status uploada slika"
        >
          <div className="flex flex-col items-center gap-3 w-full max-w-md">
            <h3 className="text-[#E2C275] text-lg font-bold tracking-wide mb-4">
              Upload slika u toku
            </h3>
            
            {/* Lista slika sa statusima */}
            <div className="w-full space-y-4">
              {uploadStatuses.map((status, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg w-full">
                  {/* Preview slike */}
                  <div 
                    className="w-16 h-16 rounded-md bg-cover bg-center flex-shrink-0" 
                    style={{ backgroundImage: status.preview ? `url(${status.preview})` : 'none' }}
                  />
                  
                  <div className="flex-grow">
                    {/* Ime fajla */}
                    <p className="text-sm font-medium truncate mb-1">{status.file.name}</p>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${status.status === 'error' ? 'bg-red-500' : 'bg-[#E2C275]'}`} 
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                    
                    {/* Status tekst */}
                    <p className="text-xs text-gray-500">
                      {status.status === 'waiting' && 'Čeka na upload...'}
                      {status.status === 'uploading' && 'Slanje u toku...'}
                      {status.status === 'success' && 'Uspješno uploadovano'}
                      {status.status === 'error' && (status.error || 'Greška pri uploadu')}
                    </p>
                  </div>
                  
                  {/* Status ikona */}
                  <div className="w-6 flex-shrink-0">
                    {status.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 text-[#E2C275] animate-spin" />
                    )}
                    {status.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Ukupni progress */}
            {isLoading && (
              <div className="flex gap-1 mt-4">
                <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="block w-2 h-2 bg-[#E2C275] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            )}
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

