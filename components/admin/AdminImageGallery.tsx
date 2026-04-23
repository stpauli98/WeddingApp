import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { Download, CheckCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SwipeLightbox } from "@/components/shared/SwipeLightbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GuestDetail } from "@/components/ui/types";
import { useTranslation } from "react-i18next";

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
    toast({ variant: "destructive", description: 'Došlo je do greške pri preuzimanju slike.' });
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

// Komponenta za prikaz pojedinačne fotografije. Klik na sliku otvara lightbox
// (upravljan od strane roditeljskog galerije preko onOpenLightbox callback-a).
function PhotoCard({
  photo,
  selectionMode,
  isSelected,
  onSelect,
  onLike,
  onOpenLightbox,
}: {
  photo: Photo;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onLike?: () => void;
  onOpenLightbox: () => void;
}) {
  const validUrl = photo.imageUrl && photo.imageUrl.trim() !== "" ? photo.imageUrl : "/no-image-uploaded.png";

  return (
    <div className="relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-200 hover:shadow-lg border border-[hsl(var(--lp-accent))]/20">
      {selectionMode && (
        <button
          className={`absolute left-2 top-2 z-10 rounded-full p-1 ${isSelected ? 'bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))]' : 'bg-white/80 text-[hsl(var(--lp-muted-foreground))]'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-label={isSelected ? "Deselect" : "Select"}
        >
          <CheckCircle className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenLightbox}
        className="relative aspect-square w-full overflow-hidden bg-[hsl(var(--lp-muted))]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lp-primary))]"
        aria-label="Otvori sliku"
      >
        <Image
          src={validUrl}
          alt="Fotografija sa vjenčanja"
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </button>

      <div className="flex items-center justify-between p-2">
        <div className="text-xs text-[hsl(var(--lp-muted-foreground))]">{photo.uploadDate || "Nedavno"}</div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
            className={`rounded-full p-1 ${photo.isLiked ? 'text-[hsl(var(--lp-accent))]' : 'text-[hsl(var(--lp-muted-foreground))] hover:text-[hsl(var(--lp-accent))]'}`}
            aria-label={photo.isLiked ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
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
              downloadImageHelper(validUrl, "fotografija");
            }}
            className="rounded-full p-1 text-slate-400 hover:text-blue-500"
            aria-label="Preuzmi sliku"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
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
  onImageDeleted?: (id: string) => void; // Optional: parent refetches on success
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
  zipFileNamePrefix = 'slike',
  onImageDeleted,
}: AdminImageGalleryProps) {
  const { t } = useTranslation();
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Optimistic hide of deleted images until parent refetches.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Učitaj omiljene slike pri inicijalizaciji komponente
  useEffect(() => {
    setFavoriteIds(getFavoriteImages());
  }, []);

  // Fetch admin CSRF token for single-image delete action inside the lightbox.
  useEffect(() => {
    fetch('/api/admin/images', { method: 'GET', credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        // Silent failure — delete button will no-op + show toast if user clicks it.
      });
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

  // Selektuj sve fotografije (samo one koje su stvarno vidljive — ne uključuje
  // optimistično sakrivene nakon delete-a).
  const selectAll = () => {
    const visibleAll = images.filter(img => !hiddenIds.has(img.id));
    if (selectedPhotos.length === visibleAll.length) {
      handleSelectChange([]);
    } else {
      handleSelectChange(visibleAll.map(img => img.id));
    }
  };

  // Preuzimanje selektovanih slika kao ZIP
  const downloadSelected = async () => {
    if (selectedPhotos.length === 0) return;
    const visibleAll = images.filter(img => !hiddenIds.has(img.id));

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let validCount = 0;

      for (let idx = 0; idx < visibleAll.length; idx++) {
        const img = visibleAll[idx];
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
        toast({ variant: "destructive", description: 'Nijedna selektovana slika nije validna za preuzimanje.' });
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
      toast({ variant: "destructive", description: 'Došlo je do greške pri kreiranju ZIP fajla.' });
    }
  };

  // Preuzimanje svih slika kao ZIP
  const downloadAll = async () => {
    const visibleAll = images.filter(img => !hiddenIds.has(img.id));
    if (visibleAll.length === 0) return;

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let validCount = 0;

      for (let idx = 0; idx < visibleAll.length; idx++) {
        const img = visibleAll[idx];
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
        toast({ variant: "destructive", description: 'Nijedna slika nije validna za preuzimanje.' });
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
      toast({ variant: "destructive", description: 'Došlo je do greške pri kreiranju ZIP fajla.' });
    }
  };

  // Slike vidljive u trenutnom tab-u (koristi se za lightbox navigaciju).
  const allVisible = images.filter(img => !hiddenIds.has(img.id));
  const visibleImages = activeTab === 'favorites'
    ? allVisible.filter(img => favoriteIds.includes(img.id))
    : allVisible;

  // Single-image delete (admin) — optimistic: hide from UI immediately,
  // fire DELETE in background, rollback on failure.
  const handleSingleDelete = async (imageId: string): Promise<void> => {
    if (!csrfToken) {
      toast({ variant: 'destructive', description: 'CSRF token nije učitan. Osvježite stranicu.' });
      throw new Error('missing_csrf');
    }

    // Optimistic hide + strip from selection/favorites in the same render.
    setHiddenIds(prev => new Set(prev).add(imageId));
    const wasSelected = selectedPhotos.includes(imageId);
    if (wasSelected) {
      handleSelectChange(selectedPhotos.filter(id => id !== imageId));
    }
    const wasFavorite = favoriteIds.includes(imageId);
    if (wasFavorite) {
      const nextFavs = favoriteIds.filter(id => id !== imageId);
      setFavoriteIds(nextFavs);
      saveFavoriteImages(nextFavs);
    }
    onImageDeleted?.(imageId);

    // Fire-and-rollback: return control to caller immediately so the lightbox
    // can advance; handle the network result asynchronously.
    void (async () => {
      try {
        const res = await fetch(`/api/admin/images/${encodeURIComponent(imageId)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'x-csrf-token': csrfToken },
        });
        // 404 = already gone server-side → matches our optimistic state.
        if (res.ok || res.status === 404) return;
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'delete_failed');
      } catch (err) {
        // Rollback optimistic mutations.
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
        if (wasFavorite) {
          const restored = [...favoriteIds];
          setFavoriteIds(restored);
          saveFavoriteImages(restored);
        }
        console.error('[admin-image-delete] failed', err);
        toast({
          variant: 'destructive',
          description: (err instanceof Error && err.message) || 'Brisanje nije uspjelo.',
        });
      }
    })();
  };

  // Bulk delete — optimistic: hide all immediately, fire POST in background,
  // rollback on failure. UI returns instantly; network resolves async.
  const handleBulkDelete = (): void => {
    if (!csrfToken) {
      toast({ variant: 'destructive', description: 'CSRF token nije učitan. Osvježite stranicu.' });
      return;
    }
    if (selectedPhotos.length === 0) return;

    const idsToDelete = [...selectedPhotos];
    const previousFavorites = [...favoriteIds];
    const deletedSet = new Set(idsToDelete);

    // Optimistic state mutations — UI updates this tick.
    setHiddenIds(prev => {
      const next = new Set(prev);
      for (const id of idsToDelete) next.add(id);
      return next;
    });
    handleSelectChange([]);
    if (favoriteIds.some(id => deletedSet.has(id))) {
      const nextFavs = favoriteIds.filter(id => !deletedSet.has(id));
      setFavoriteIds(nextFavs);
      saveFavoriteImages(nextFavs);
    }
    for (const id of idsToDelete) onImageDeleted?.(id);
    setLightboxIndex(null);
    setBulkDeleteOpen(false);

    // Fire-and-rollback.
    setBulkDeleting(true);
    void (async () => {
      try {
        const res = await fetch('/api/admin/images/bulk-delete', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ ids: idsToDelete }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'bulk_delete_failed');
        }
        const data = await res.json();
        toast({
          description: `Obrisano ${data.deletedCount ?? idsToDelete.length} slika.`,
        });
      } catch (err) {
        // Rollback: unhide images, restore favorites.
        setHiddenIds(prev => {
          const next = new Set(prev);
          for (const id of idsToDelete) next.delete(id);
          return next;
        });
        setFavoriteIds(previousFavorites);
        saveFavoriteImages(previousFavorites);
        console.error('[bulk-delete] failed', err);
        toast({
          variant: 'destructive',
          description: (err instanceof Error && err.message) || 'Brisanje nije uspjelo.',
        });
      } finally {
        setBulkDeleting(false);
      }
    })();
  };

  // Ako nema (ni vidljivih) slika, prikaži poruku. Koristi allVisible da se
  // empty state pojavi i nakon što admin optimistično obriše sve slike.
  if (allVisible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <Image
          src="/no-image-uploaded.png"
          alt={t('admin.imageGallery.noPhotos')}
          width={128}
          height={128}
          className="w-32 h-32 object-contain opacity-80 mb-2"
        />
        <div className="text-center text-muted-foreground">{t('admin.imageGallery.noPhotos')}</div>
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
              {allVisible.length} {t('admin.imageGallery.allPhotos')}
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
                  {t('common.cancel')}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  {t('common.select')}
                </>
              )}
            </Button>
            <Button
              className="bg-[hsl(var(--lp-muted))]/50 hover:bg-[hsl(var(--lp-muted))]/70 text-[hsl(var(--lp-primary))] text-xs sm:text-sm flex-1 sm:flex-none"
              size="sm"
              onClick={downloadAll}
            >
              <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              {t('common.downloadAll')}
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        {selectionMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 bg-[hsl(var(--lp-muted))]/30 border-y border-[hsl(var(--lp-accent))]/20 gap-2 sm:gap-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="text-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-muted))]/50 text-xs sm:text-sm" onClick={selectAll}>
                {selectedPhotos.length === allVisible.length && allVisible.length > 0 ? t('common.unselectAll') : t('common.selectAll')}
              </Button>
              <span className="text-xs sm:text-sm text-[hsl(var(--lp-muted-foreground))]">
                {selectedPhotos.length} {t('admin.imageGallery.selected')} {t('admin.imageGallery.of')} {allVisible.length}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                className="bg-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-primary-hover))] text-[hsl(var(--lp-primary-foreground))] text-xs sm:text-sm"
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
                {t('admin.imageGallery.downloadSelected')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs sm:text-sm"
                disabled={selectedPhotos.length === 0 || bulkDeleting}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {t('admin.imageGallery.deleteSelected', 'Obriši selektovane')}
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'all' | 'favorites')}
          className="px-6 pt-4"
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-[hsl(var(--lp-muted))]/30">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                {t('admin.imageGallery.allPhotos')}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-white">
                {t('admin.imageGallery.favorites')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <div className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-6">
                {visibleImages.map((img, idx) => {
                  const photo: Photo = {
                    id: img.id,
                    imageUrl: img.imageUrl,
                    isLiked: favoriteIds.includes(img.id),
                  };
                  return (
                    <PhotoCard
                      key={img.id}
                      photo={photo}
                      selectionMode={selectionMode}
                      isSelected={selectedPhotos.includes(img.id)}
                      onSelect={() => togglePhotoSelection(img.id)}
                      onLike={() => toggleFavorite(img.id)}
                      onOpenLightbox={() => setLightboxIndex(idx)}
                    />
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="m-0">
            <div className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-6">
                {visibleImages.map((img, idx) => {
                  const photo: Photo = {
                    id: img.id,
                    imageUrl: img.imageUrl,
                    isLiked: true,
                  };
                  return (
                    <PhotoCard
                      key={img.id}
                      photo={photo}
                      selectionMode={selectionMode}
                      isSelected={selectedPhotos.includes(img.id)}
                      onSelect={() => togglePhotoSelection(img.id)}
                      onLike={() => toggleFavorite(img.id)}
                      onOpenLightbox={() => setLightboxIndex(idx)}
                    />
                  );
                })}

                {visibleImages.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-[hsl(var(--lp-muted-foreground))]">
                    <p>{t('admin.imageGallery.noFavorites')}</p>
                    <p className="text-sm mt-2 text-[hsl(var(--lp-muted-foreground))]/80">{t('admin.imageGallery.clickHeartToFavorite')}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.imageGallery.bulkDeleteTitle', 'Obrisati selektovane slike?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.imageGallery.bulkDeleteDescription', 'Ova akcija je nepovratna. Obrisaće se {{count}} {{word}}.', {
                count: selectedPhotos.length,
                word: selectedPhotos.length === 1 ? 'slika' : 'slika',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkDeleting}
              className="bg-[hsl(var(--lp-destructive))] text-white hover:bg-[hsl(var(--lp-destructive))]/90"
            >
              {bulkDeleting ? 'Brisanje...' : t('admin.imageGallery.deleteSelected', 'Obriši selektovane')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lightboxIndex !== null && visibleImages.length > 0 && (
        <SwipeLightbox
          images={visibleImages.map(img => ({ id: img.id, imageUrl: img.imageUrl }))}
          startIndex={Math.min(lightboxIndex, visibleImages.length - 1)}
          onClose={() => setLightboxIndex(null)}
          onDelete={csrfToken ? handleSingleDelete : undefined}
          onDownload={(img) => downloadImageHelper(img.imageUrl, 'fotografija')}
          onToggleFavorite={toggleFavorite}
          favoriteIds={new Set(favoriteIds)}
          onToggleSelect={togglePhotoSelection}
          selectedIds={new Set(selectedPhotos)}
        />
      )}
    </div>
  );
}
