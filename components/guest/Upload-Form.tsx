"use client"

import React, { useState } from "react";
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/guest/ImageUpload"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { CheckCircle, Loader2, AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageSlotBar } from "@/components/guest/ImageSlotBar"
import { useTranslation } from "react-i18next"

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
  retryable?: boolean; // Označava da li se upload može ponovno pokušati
  id: string; // Jedinstveni identifikator za svaki upload status
}

interface UploadFormProps {
  guestId: string;
  message?: string;
  existingImagesCount?: number; // Dodajemo opcioni prop za broj postojećih slika
  language?: string; // Dodajemo prop za jezik
}

export function UploadForm({ guestId, message, existingImagesCount: initialImagesCount = 0, language = 'sr' }: UploadFormProps) {
  const { t, i18n } = useTranslation();
  
  // Postavi jezik ako je različit od trenutnog
  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  // Funkcija za ponovno pokušavanje uploada neuspjelih slika
  async function retryFailedUploads() {
    // Filtriraj samo slike koje su označene kao retryable
    const failedUploads = uploadStatuses.filter(status => status.status === 'error' && status.retryable);
    
    if (failedUploads.length === 0) return;
    
    setIsLoading(true);
    
    let retrySuccessCount = 0;
    
    for (const failedStatus of failedUploads) {
      try {
        // Pronađi indeks u trenutnom nizu statusa
        const statusIndex = uploadStatuses.findIndex(s => s.id === failedStatus.id);
        if (statusIndex === -1) continue;
        
        // Ažuriraj status da je slika u procesu ponovnog uploada
        setUploadStatuses(prev => prev.map((status) => 
          status.id === failedStatus.id ? { ...status, status: 'uploading', progress: 10, retryable: false } : status
        ));
        
        // Resize slike
        const resizedImg = await resizeImage(failedStatus.file);
        
        // Ažuriraj progress nakon resize-a
        setUploadStatuses(prev => prev.map((status) => 
          status.id === failedStatus.id ? { ...status, progress: 30 } : status
        ));
        
        // Kreiraj formData za pojedinačnu sliku
        const imageFormData = new FormData();
        imageFormData.append("images", resizedImg);
        
        // Ažuriraj progress prije uploada
        setUploadStatuses(prev => prev.map((status) => 
          status.id === failedStatus.id ? { ...status, progress: 50 } : status
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
        setUploadStatuses(prev => prev.map((status) => 
          status.id === failedStatus.id ? { ...status, status: 'success', progress: 100 } : status
        ));
        
        retrySuccessCount++;
      } catch (error) {
        // Ažuriraj status da je došlo do greške pri ponovnom uploadu slike
        setUploadStatuses(prev => prev.map((status) => 
          status.id === failedStatus.id ? { 
            ...status, 
            status: 'error', 
            error: error instanceof Error ? error.message : "Greška pri ponovnom uploadu",
            retryable: true // I dalje je retryable
          } : status
        ));
      }
    }
    
    // Provjeri da li su sve slike uspješno uploadovane
    const allSuccess = uploadStatuses.every(status => status.status === 'success');
    
    if (allSuccess) {
      setTimeout(() => {
        window.location.href = "/guest/success";
      }, 1500);
    } else {
      setIsLoading(false);
    }
  }
  
  // Funkcija za ponovni pokušaj uploada jedne slike
  async function retryUpload(statusId: string) {
    const statusIndex = uploadStatuses.findIndex(s => s.id === statusId);
    if (statusIndex === -1) return;
    
    const failedStatus = uploadStatuses[statusIndex];
    
    setIsLoading(true);
    
    try {
      // Ažuriraj status da je slika u procesu ponovnog uploada
      setUploadStatuses(prev => prev.map((status) => 
        status.id === statusId ? { ...status, status: 'uploading', progress: 10, retryable: false } : status
      ));
      
      // Resize slike
      const resizedImg = await resizeImage(failedStatus.file);
      
      // Ažuriraj progress nakon resize-a
      setUploadStatuses(prev => prev.map((status) => 
        status.id === statusId ? { ...status, progress: 30 } : status
      ));
      
      // Kreiraj formData za pojedinačnu sliku
      const imageFormData = new FormData();
      imageFormData.append("images", resizedImg);
      
      // Ažuriraj progress prije uploada
      setUploadStatuses(prev => prev.map((status) => 
        status.id === statusId ? { ...status, progress: 50 } : status
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
      setUploadStatuses(prev => prev.map((status) => 
        status.id === statusId ? { ...status, status: 'success', progress: 100 } : status
      ));
      
      // Provjeri da li su sve slike uspješno uploadovane
      const allSuccess = uploadStatuses.every(status => 
        status.status === 'success' || status.id === statusId
      );
      
      if (allSuccess) {
        setTimeout(() => {
          window.location.href = "/guest/success";
        }, 1500);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      // Ažuriraj status da je došlo do greške pri ponovnom uploadu slike
      setUploadStatuses(prev => prev.map((status) => 
        status.id === statusId ? { 
          ...status, 
          status: 'error', 
          error: error instanceof Error ? error.message : "Greška pri ponovnom uploadu",
          retryable: true // I dalje je retryable
        } : status
      ));
      
      setIsLoading(false);
    }
  }
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<ImageUploadStatus[]>([])
  const [showUploadStatus, setShowUploadStatus] = useState(false)
  const [showLimitError, setShowLimitError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedImagesCount, setSelectedImagesCount] = useState(0);
  const [existingImagesCount, setExistingImagesCount] = useState(initialImagesCount || 0);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: message ?? "", images: [] },
  })

  // Povuci CSRF token i broj postojećih slika na mount
  React.useEffect(() => {
    // Dohvati CSRF token
    fetch("/api/guest/upload")
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null)); // Token je sada csrf_token_guest_upload u kolačiću
    
    // Dohvati broj postojećih slika samo ako nije proslijeđen kroz props
    if (guestId && initialImagesCount === undefined) {
      fetch(`/api/guest/images/count?guestId=${guestId}`)
        .then(res => res.json())
        .then(data => {
          if (data.count !== undefined) {
            setExistingImagesCount(data.count);
            console.log(`Broj postojećih slika: ${data.count}`);
          }
        })
        .catch(err => console.error("Greška pri dohvatanju broja slika:", err));
    }
  }, [guestId, initialImagesCount]);
  
  // Dodajemo novi useEffect koji će osvježiti broj slika kada se komponenta ponovno renderuje
  React.useEffect(() => {
    // Ako je proslijeđen initialImagesCount, koristi ga
    if (initialImagesCount !== undefined) {
      setExistingImagesCount(initialImagesCount);
      console.log(`Ažuriran broj postojećih slika iz props-a: ${initialImagesCount}`);
    }
  }, [initialImagesCount]);

  // Funkcija za resize i optimizaciju slike za Cloudinary
  async function resizeImage(file: File, maxWidth = 1280): Promise<File> {
    return new Promise((resolve, reject) => {
      // Ako je slika manja od 1MB, ne radimo resize
      if (file.size < 1024 * 1024) {
        console.log(`Slika ${file.name} je manja od 1MB, preskačemo resize`);
        resolve(file);
        return;
      }

      const img = new window.Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Računamo novi width i height za resize
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Ako je slika već manja od maxWidth, samo optimiziramo kvalitetu
        // Cloudinary će se pobrinuti za dodatnu optimizaciju
        if (img.width <= maxWidth && file.size < 2 * 1024 * 1024) {
          resolve(file);
          return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas not supported");
        
        // Crtamo sliku na canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Određujemo kvalitetu kompresije na osnovu veličine slike
        let quality = 0.85; // Osnovna kvaliteta
        
        // Ako je slika veća od 5MB, dodatno smanjujemo kvalitetu
        if (file.size > 5 * 1024 * 1024) {
          quality = 0.75;
        }
        
        // Za JPEG i JPG slike koristimo JPEG format za bolju kompresiju
        const outputType = file.type.includes('jpeg') || file.type.includes('jpg') 
          ? 'image/jpeg' 
          : file.type;

        // Konvertujemo u blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Kreiramo novi File objekat sa optimiziranim blob-om
              const newFile = new File([blob], file.name, { type: outputType });
              console.log(`Slika ${file.name} optimizirana: ${(file.size / (1024 * 1024)).toFixed(2)}MB -> ${(newFile.size / (1024 * 1024)).toFixed(2)}MB`);
              resolve(newFile);
            } else {
              // Ako toBlob ne uspije, vrati originalnu sliku
              console.warn(`Nije moguće optimizirati sliku ${file.name}, koristimo originalnu`);
              resolve(file);
            }
          },
          outputType,
          quality // Prilagođena kvaliteta
        );
      };
      
      reader.onerror = (e) => {
        // U slučaju greške, vrati originalnu sliku
        console.error(`Greška pri optimizaciji slike ${file.name}:`, e);
        resolve(file);
      };
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Dodatna provjera ukupnog broja slika prije slanja (postojeće + nove)
    const totalImages = existingImagesCount + (values.images?.length || 0);
    if (totalImages > 10) {
      const preostalo = Math.max(0, 10 - existingImagesCount);
      setErrorMessage(
        `Možete imati najviše 10 slika ukupno. Trenutno imate ${existingImagesCount} slika, ` +
        `tako da možete dodati još najviše ${preostalo} ${preostalo === 1 ? 'sliku' : preostalo >= 2 && preostalo <= 4 ? 'slike' : 'slika'}.`
      );
      setShowLimitError(true);
      return;
    }
    
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
          preview: URL.createObjectURL(file),
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` // Generisanje jedinstvenog ID-a
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
              error: error instanceof Error ? error.message : "Greška pri uploadu",
              retryable: true // Označavamo da se ovaj upload može ponovno pokušati
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
        // Umjesto alert-a, korisnik će vidjeti status svake slike i imati opciju za retry
        setIsLoading(false);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Došlo je do greške prilikom slanja");
      setIsLoading(false);
      setShowUploadStatus(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      {/* Prikaz obavještenja o prekoračenju limita slika */}
      {showLimitError && (
        <div className="p-4 border-b border-gray-200">
          <Alert variant="destructive" className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </div>
            <button 
              onClick={() => setShowLimitError(false)} 
              className="text-gray-500 hover:text-gray-700"
              aria-label="Zatvori obavještenje"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}
      
      {showUploadStatus && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 md:p-6 overflow-y-auto"
          aria-live="assertive"
          aria-label="Status uploada slika"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header sa naslovom i brojem uploadovanih slika */}
            <div className="sticky top-0 bg-white p-4 border-b border-[hsl(var(--lp-accent))]/10 flex items-center justify-between z-10">
              <div>
                <h3 className="text-[hsl(var(--lp-primary))] text-lg font-semibold">
                  {t('guest.dashboard.uploadPhotos')}
                </h3>
                <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
                  {uploadStatuses.filter(s => s.status === 'success').length} od {uploadStatuses.length} slika
                </p>
              </div>
              
              {/* Indikator ukupnog progresa */}
              {isLoading && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[hsl(var(--lp-primary))] rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-[hsl(var(--lp-primary))] rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-[hsl(var(--lp-primary))] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                </div>
              )}
            </div>
            
            {/* Lista slika sa statusima */}
            <div className="p-4 space-y-3">
              {uploadStatuses.map((status, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${status.status === 'success' ? 'border-[hsl(var(--lp-success))]/20 bg-[hsl(var(--lp-success))]/10' : status.status === 'error' ? 'border-[hsl(var(--lp-destructive))]/20 bg-[hsl(var(--lp-destructive))]/10' : 'border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-muted))]/30'}`}
                >
                  {/* Preview slike */}
                  <div 
                    className="w-14 h-14 md:w-16 md:h-16 rounded-md bg-cover bg-center flex-shrink-0 border border-[hsl(var(--lp-border))]" 
                    style={{ backgroundImage: status.preview ? `url(${status.preview})` : 'none' }}
                  />
                  
                  <div className="flex-grow min-w-0">
                    {/* Ime fajla */}
                    <p className="text-sm font-medium truncate mb-1.5">{status.file.name}</p>
                    
                    {/* Progress bar sa animacijom */}
                    <div className="w-full bg-[hsl(var(--lp-muted))]/30 rounded-full h-1.5 mb-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${status.status === 'error' ? 'bg-[hsl(var(--lp-destructive))]' : status.status === 'success' ? 'bg-[hsl(var(--lp-success))]' : 'bg-[hsl(var(--lp-primary))]/90'}`} 
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                    
                    {/* Status tekst */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                        {status.status === 'waiting' && 'Čeka na upload...'}
                        {status.status === 'uploading' && 'Slanje u toku...'}
                        {status.status === 'success' && 'Uspješno uploadovano'}
                        {status.status === 'error' && (status.error || 'Greška pri uploadu')}
                      </p>
                      <span className="text-xs font-medium text-[hsl(var(--lp-foreground))]">{status.progress}%</span>
                    </div>
                  </div>
                  
                  {/* Status ikona */}
                  <div className="flex-shrink-0">
                    {status.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 text-[hsl(var(--lp-accent))] animate-spin" />
                    )}
                    {status.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-[hsl(var(--lp-success))]" />
                    )}
                    {status.status === 'error' && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-5 w-5 text-[hsl(var(--lp-destructive))]" />
                        {status.retryable && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-[hsl(var(--lp-primary))] hover:text-[hsl(var(--lp-primary-hover))] hover:bg-[hsl(var(--lp-muted))]/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryUpload(status.id);
                            }}
                            disabled={isLoading}
                          >
                            Pokušaj ponovo
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer sa informacijom i opcijom za retry svih */}
            <div className="sticky bottom-0 bg-white p-4 border-t border-[hsl(var(--lp-accent))]/10 flex justify-between items-center">
              <span className="text-sm text-[hsl(var(--lp-muted-foreground))]">
                {isLoading 
                  ? "Molimo sačekajte dok se slike uploaduju..." 
                  : uploadStatuses.some(s => s.status === 'error' && s.retryable)
                    ? "Neke slike nisu uspješno uploadovane."
                    : "Status uploada slika"}
              </span>
              
              {!isLoading && uploadStatuses.some(s => s.status === 'error' && s.retryable) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={retryFailedUploads}
                >
                  Pokušaj ponovno sve neuspjele
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle>{t('guest.uploadForm.addImages', 'Dodaj slike')}</CardTitle>
        
        {/* Korištenje postojeće ImageSlotBar komponente */}
        <ImageSlotBar 
          current={selectedImagesCount + (initialImagesCount || 0)} 
          max={10} 
          language={language}
        />
      </CardHeader>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        aria-busy={isLoading}
        aria-describedby="upload-instructions"
      >
        <CardContent className="space-y-6">
          <div>
            <label className="block font-medium mb-1" htmlFor="images-upload">{t('guest.uploadForm.imagesMax10', 'Slike (max 10)')}</label>
            <span id="upload-instructions" className="sr-only">{t('guest.uploadForm.a11yInstructions', 'Prvo izaberite slike, zatim kliknite na dugme Potvrdi upload. Sve akcije su dostupne tastaturom. Status slanja će biti automatski najavljen.')}</span>

            <ImageUpload
              value={form.watch("images") || []}
              onChange={val => {
                // Provjeri ukupan broj slika (postojeće + nove)
                const totalImages = existingImagesCount + val.length;
                setSelectedImagesCount(val.length);
                
                if (totalImages > 10) {
                  // Prikaži toast obavještenje o prekoračenju limita
                  const preostalo = Math.max(0, 10 - existingImagesCount);
                  setErrorMessage(
                    `Možete poslati najviše 10 slika ukupno. Trenutno imate ${existingImagesCount} slika, ` +
                    `tako da možete dodati još najviše ${preostalo} ${preostalo === 1 ? 'sliku' : preostalo >= 2 && preostalo <= 4 ? 'slike' : 'slika'}.`
                  );
                  setShowLimitError(true);
                  
                  // Ograniči na maksimalan dozvoljeni broj slika
                  if (preostalo > 0) {
                    form.setValue("images", val.slice(0, preostalo));
                    setSelectedImagesCount(preostalo);
                  } else {
                    form.setValue("images", []);
                    setSelectedImagesCount(0);
                  }
                } else {
                  form.setValue("images", val);
                  setShowLimitError(false); // Sakrij poruku o grešci ako je broj slika validan
                }
              }}
              maxFiles={10}
              inputProps={{
                id: "images-upload",
                'aria-label': "Izaberite slike za upload (maksimalno 10)",
              }}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">{t('guest.uploadForm.messageOptional', 'Poruka (opciono)')}</label>
            <Textarea
              placeholder={t('guest.uploadForm.messagePlaceholder', 'Napišite poruku ili čestitku mladencima...')}
              rows={4}
              {...form.register("message")}
            />
            <p className="text-sm text-[hsl(var(--lp-muted-foreground))] mt-1">{t('guest.uploadForm.maxChars', 'Maksimalno 500 karaktera')}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            aria-label={t('guest.uploadForm.a11ySubmitButton', 'Pošalji slike i poruku mladencima')}
            disabled={isLoading || (form.watch("images")?.length ?? 0) === 0}
          >
            {isLoading ? t('guest.uploadForm.sending', 'Slanje...') : t('guest.uploadForm.confirmUpload', 'Potvrdi upload')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

