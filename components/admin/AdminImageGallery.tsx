import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, CheckCircle, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { GuestDetail } from "@/components/ui/types";
import dynamic from "next/dynamic";

// Pomoćna funkcija za preuzimanje slika koja podržava različite formate
async function downloadImageHelper(imgUrl: string, fileName = "fotografija") {
  try {
    // Provjera je li base64
    const match = imgUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      const ext = match[1] || 'jpg';
      const base64 = match[2];
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${ext}` });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.${ext}`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      return;
    }
    
    // Ako nije base64, provjeri je li URL
    const urlMatch = imgUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);
    const ext = urlMatch ? urlMatch[1] : 'jpg';
    
    // Za URL-ove, moramo dohvatiti sliku i pretvoriti je u blob
    const response = await fetch(imgUrl);
    if (!response.ok) throw new Error('Neuspješno preuzimanje slike');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  } catch (error) {
    console.error('Greška pri preuzimanju slike:', error);
    alert('Došlo je do greške pri preuzimanju slike. Molimo pokušajte ponovno.');
  }
}

// Tipovi za novu implementaciju
interface Photo {
  id: string;
  imageUrl: string;
  isLiked?: boolean;
  uploadDate?: string;
}

// Tip Guest više nije potreban jer smo uklonili adaptGuestDetail funkciju

// Komponenta za prikaz pojedinačne fotografije
function PhotoCard({
  photo,
  selectionMode,
  isSelected,
  onSelect,
  onLike,
  onShare,
}: {
  photo: Photo;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onLike?: () => void;
  onShare?: () => void;
}) {
  const [fullView, setFullView] = useState<boolean>(false);
  const validUrl = photo.imageUrl && photo.imageUrl.trim() !== "" ? photo.imageUrl : "/no-image-uploaded.png";

  const downloadImage = (imgUrl: string) => {
    downloadImageHelper(imgUrl, "fotografija");
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-200 hover:shadow-lg border border-[hsl(var(--lp-accent))]/20">
        {selectionMode && (
          <button
            className={`absolute left-2 top-2 z-10 rounded-full p-1 ${isSelected ? 'bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))]' : 'bg-white/80 text-[hsl(var(--lp-muted-foreground))]'}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <CheckCircle className="h-5 w-5" />
          </button>
        )}

        <div className="relative aspect-square overflow-hidden bg-[hsl(var(--lp-muted))]/30">
          <Image
            src={validUrl}
            alt="Fotografija sa vjenčanja"
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            onClick={() => setFullView(true)}
          />
        </div>

        <div className="flex items-center justify-between p-2">
          <div className="text-xs text-[hsl(var(--lp-muted-foreground))]">{photo.uploadDate || "Nedavno"}</div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike?.();
              }}
              className={`rounded-full p-1 ${photo.isLiked ? 'text-[hsl(var(--lp-accent))]' : 'text-[hsl(var(--lp-muted-foreground))] hover:text-[hsl(var(--lp-accent))]'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={photo.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                className="h-4 w-4"
                strokeWidth={photo.isLiked ? 0 : 2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(validUrl);
              }}
              className="rounded-full p-1 text-slate-400 hover:text-blue-500"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {fullView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFullView(false)}
        >
          <div className="relative flex h-full w-full max-h-[90vh] max-w-4xl items-center justify-center">
            <Image
              src={validUrl}
              alt="Slika gosta"
              width={1200}
              height={900}
              className="rounded-2xl bg-white p-2 shadow-2xl object-contain"
              style={{ maxWidth: '90vw', maxHeight: '85vh', width: 'auto', height: 'auto', display: 'block', margin: '0 auto' }}
            />
            {/* X za zatvaranje u gornjem desnom uglu */}
            <div className="absolute right-4 z-30 flex items-center justify-center" style={{ top: 'calc(1rem + 20px)' }}>
              <button
                onClick={e => { e.stopPropagation(); setFullView(false); }}
                title="Zatvori prikaz"
                type="button"
                className="bg-white/80 hover:bg-red-100 border border-gray-200 rounded-full shadow-lg p-2 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <span className="sr-only">Zatvori</span>
                <X className="w-7 h-7 text-red-500 hover:text-red-700" />
              </button>
            </div>
            {/* Download dugme u donjem desnom uglu */}
            <div className="absolute right-4 z-30 flex items-center justify-center" style={{ bottom: 'calc(1rem + 20px)' }}>
              <button
                onClick={e => { e.stopPropagation(); downloadImage(validUrl); }}
                title="Preuzmi ovu sliku"
                type="button"
                className="bg-white/80 hover:bg-blue-100 border border-gray-200 rounded-full shadow-lg p-2 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <Download className="w-7 h-7 text-blue-600 hover:text-blue-800" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Props za AdminImageGallery komponentu
interface AdminImageGalleryProps {
  images: GuestDetail["images"];
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  onDownloadSelected?: () => void;
  downloadSelectedLoading?: boolean;
  onBack?: () => void;
  zipFileNamePrefix?: string; // Opcioni prefiks za ime ZIP fajla
}

// Lokalno skladište za omiljene slike
const FAVORITES_STORAGE_KEY = 'wedding_app_favorite_images';

// Funkcije za rad s omiljenim slikama
const getFavoriteImages = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Greška pri čitanju omiljenih slika:', e);
    return [];
  }
};

const saveFavoriteImages = (ids: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Greška pri spremanju omiljenih slika:', e);
  }
};

// Glavna komponenta - AdminImageGallery
export function AdminImageGallery({ 
  images, 
  selectedIds, 
  onSelectChange, 
  onDownloadSelected, 
  downloadSelectedLoading,
  onBack,
  zipFileNamePrefix = 'slike'
}: AdminImageGalleryProps) {
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  
  // Učitaj omiljene slike pri inicijalizaciji komponente
  useEffect(() => {
    setFavoriteIds(getFavoriteImages());
  }, []);
  
  // Koristi selectedIds ako je proslijeđen, inače koristi lokalni state
  const selectedPhotos = selectedIds || localSelected;
  
  // Funkcija za promjenu selekcije
  const handleSelectChange = (newSelection: string[]) => {
    if (onSelectChange) {
      onSelectChange(newSelection);
    } else {
      setLocalSelected(newSelection);
    }
  };

  // Toggle selekcije fotografije
  const togglePhotoSelection = (photoId: string) => {
    const newSelection = selectedPhotos.includes(photoId)
      ? selectedPhotos.filter(id => id !== photoId)
      : [...selectedPhotos, photoId];
    
    handleSelectChange(newSelection);
  };
  
  // Toggle omiljene fotografije
  const toggleFavorite = (photoId: string) => {
    const newFavorites = favoriteIds.includes(photoId)
      ? favoriteIds.filter(id => id !== photoId)
      : [...favoriteIds, photoId];
    
    setFavoriteIds(newFavorites);
    saveFavoriteImages(newFavorites);
  };

  // Toggle režima selekcije
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      handleSelectChange([]);
    }
  };

  // Selektuj sve fotografije
  const selectAll = () => {
    if (selectedPhotos.length === images.length) {
      handleSelectChange([]);
    } else {
      handleSelectChange(images.map(img => img.id));
    }
  };

  // Preuzimanje selektovanih slika kao ZIP
  const downloadSelected = async () => {
    if (selectedPhotos.length === 0) return;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let validCount = 0;
      
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx];
        if (!selectedPhotos.includes(img.id)) continue;
        
        try {
          if (typeof img.imageUrl !== 'string') continue;
          
          // Provjera je li base64
          const match = img.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] || 'jpg';
            const base64 = match[2];
            zip.file(`slika_${idx + 1}.${ext}`, base64, { base64: true });
            validCount++;
            continue;
          }
          
          // Provjera je li URL
          const urlMatch = img.imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);
          const ext = urlMatch ? urlMatch[1] : 'jpg';
          const response = await fetch(img.imageUrl);
          if (!response.ok) continue;
          const blob = await response.blob();
          zip.file(`slika_${idx + 1}.${ext}`, blob);
          validCount++;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Nevalidna slika za ZIP:', img.imageUrl?.slice(0, 40));
        }
      }
      
      if (validCount === 0) {
        window.alert('Nijedna selektovana slika nije validna za preuzimanje.');
        return;
      }
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipFileNamePrefix}_selektovane_slike.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    } catch (error) {
      console.error('Greška pri kreiranju ZIP fajla:', error);
      window.alert('Došlo je do greške pri kreiranju ZIP fajla.');
    }
  };

  // Preuzimanje svih slika kao ZIP
  const downloadAll = async () => {
    if (images.length === 0) return;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let validCount = 0;
      
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx];
        try {
          if (typeof img.imageUrl !== 'string') continue;
          
          // Provjera je li base64
          const match = img.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] || 'jpg';
            const base64 = match[2];
            zip.file(`slika_${idx + 1}.${ext}`, base64, { base64: true });
            validCount++;
            continue;
          }
          
          // Provjera je li URL
          const urlMatch = img.imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);
          const ext = urlMatch ? urlMatch[1] : 'jpg';
          const response = await fetch(img.imageUrl);
          if (!response.ok) continue;
          const blob = await response.blob();
          zip.file(`slika_${idx + 1}.${ext}`, blob);
          validCount++;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Nevalidna slika za ZIP:', img.imageUrl?.slice(0, 40));
        }
      }
      
      if (validCount === 0) {
        window.alert('Nijedna slika nije validna za preuzimanje.');
        return;
      }
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipFileNamePrefix}_sve_slike.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    } catch (error) {
      console.error('Greška pri kreiranju ZIP fajla:', error);
      window.alert('Došlo je do greške pri kreiranju ZIP fajla.');
    }
  };

  // Ako nema slika, prikaži poruku
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <Image
          src="/no-image-uploaded.png"
          alt="Nema slike"
          width={128}
          height={128}
          className="w-32 h-32 object-contain opacity-80 mb-2"
        />
        <div className="text-center text-muted-foreground">Nema uploadovanih slika</div>
      </div>
    );
  }

  // Više ne koristimo guestData jer smo uklonili header sekciju

  return (
    <div>
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-[hsl(var(--lp-accent))]/20">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 sm:items-center border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/50">
              {images.length} fotografija
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-[hsl(var(--lp-accent))]/20 text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-muted))]/30 text-xs sm:text-sm flex-1 sm:flex-none"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? (
                <>
                  <X className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  Otkaži
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  Odaberi
                </>
              )}
            </Button>
            <Button
              className="bg-[hsl(var(--lp-muted))]/50 hover:bg-[hsl(var(--lp-muted))]/70 text-[hsl(var(--lp-primary))] text-xs sm:text-sm flex-1 sm:flex-none"
              size="sm"
              onClick={downloadAll}
            >
              <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Preuzmi sve
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        {selectionMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 bg-[hsl(var(--lp-muted))]/30 border-y border-[hsl(var(--lp-accent))]/20 gap-2 sm:gap-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="text-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-muted))]/50 text-xs sm:text-sm" onClick={selectAll}>
                {selectedPhotos.length === images.length ? "Poništi sve" : "Odaberi sve"}
              </Button>
              <span className="text-xs sm:text-sm text-[hsl(var(--lp-muted-foreground))]">
                {selectedPhotos.length} od {images.length} odabrano
              </span>
            </div>
            <Button
              size="sm"
              className="bg-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-primary-hover))] text-[hsl(var(--lp-primary-foreground))] text-xs sm:text-sm w-full sm:w-auto"
              disabled={selectedPhotos.length === 0 || !!downloadSelectedLoading}
              onClick={onDownloadSelected || downloadSelected}
            >
              {downloadSelectedLoading ? (
                <svg className="animate-spin w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Preuzmi odabrano
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="all" className="px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-[hsl(var(--lp-muted))]/30">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                Sve fotografije
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-white">
                Omiljene
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <div className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-6">
                {images.map((img) => {
                  const photo: Photo = {
                    id: img.id,
                    imageUrl: img.imageUrl,
                    isLiked: favoriteIds.includes(img.id)
                  };
                  return (
                    <PhotoCard
                      key={img.id}
                      photo={photo}
                      selectionMode={selectionMode}
                      isSelected={selectedPhotos.includes(img.id)}
                      onSelect={() => togglePhotoSelection(img.id)}
                      onLike={() => toggleFavorite(img.id)}
                    />
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="m-0">
            <div className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-6">
                {images
                  .filter(img => favoriteIds.includes(img.id))
                  .map((img) => {
                    const photo: Photo = {
                      id: img.id,
                      imageUrl: img.imageUrl,
                      isLiked: true
                    };
                    return (
                      <PhotoCard
                        key={img.id}
                        photo={photo}
                        selectionMode={selectionMode}
                        isSelected={selectedPhotos.includes(img.id)}
                        onSelect={() => togglePhotoSelection(img.id)}
                        onLike={() => toggleFavorite(img.id)}
                      />
                    );
                  })}

                {favoriteIds.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-[hsl(var(--lp-muted-foreground))]">
                    <p>Još uvijek nemate omiljenih fotografija</p>
                    <p className="text-sm mt-2 text-[hsl(var(--lp-muted-foreground))]/80">Kliknite na ikonu srca na fotografijama koje želite označiti kao omiljene</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
