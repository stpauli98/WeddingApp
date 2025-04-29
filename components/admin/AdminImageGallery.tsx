import { useState } from "react";
import { Download, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuestDetail } from "@/components/ui/types";

interface AdminImageGalleryProps {
  images: GuestDetail["images"];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  onDownloadSelected?: () => void;
  downloadSelectedLoading?: boolean;
}

export function AdminImageGallery({ images, selectable = true, selectedIds, onSelectChange, onDownloadSelected, downloadSelectedLoading }: AdminImageGalleryProps) {
  // Ako parent kontroliše selekciju, koristi to, inače lokalni state
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const selected = selectedIds ? new Set(selectedIds) : localSelected;
  const setSelected = (fn: (prev: Set<string>) => Set<string>) => {
    if (onSelectChange) {
      const next = fn(new Set(selected));
      onSelectChange(Array.from(next));
    } else {
      setLocalSelected(fn);
    }
  };
  const [fullView, setFullView] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const downloadImage = (imgUrl: string) => {
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download = "slika-gosta.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelected = () => {
    images.filter(img => selected.has(img.id)).forEach(img => downloadImage(img.imageUrl));
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <img
          src="/no-image-uploaded.png"
          alt="Nema slike"
          className="w-32 h-32 object-contain opacity-80 mb-2"
        />
        <div className="text-center text-muted-foreground">Nema uploadovanih slika</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          disabled={selected.size === 0 || !!downloadSelectedLoading}
          onClick={onDownloadSelected || downloadSelected}
          className="flex items-center gap-2"
        >
          {downloadSelectedLoading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <Download className="w-4 h-4" />
          )}
          Preuzmi selektovane ({selected.size})
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map(img => {
          const validUrl = img.imageUrl && img.imageUrl.trim() !== "" ? img.imageUrl : "/no-image-uploaded.png";
          return (
            <div
              key={img.id}
              className={`relative aspect-square border rounded-xl overflow-hidden group bg-white shadow-lg transition-transform duration-200 hover:shadow-xl hover:scale-105 ${selected.has(img.id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <button
                className="absolute top-2 left-2 z-10 bg-white/80 rounded p-1"
                onClick={e => { e.stopPropagation(); toggleSelect(img.id); }}
                title={selected.has(img.id) ? 'Deselect' : 'Select'}
                type="button"
              >
                {selected.has(img.id) ? <CheckSquare className="text-blue-600 w-5 h-5" /> : <Square className="w-5 h-5 text-gray-400" />}
              </button>
              {!selectable && (
                <button
                  className="absolute top-2 right-2 z-10 bg-white/80 rounded p-1"
                  onClick={e => { e.stopPropagation(); downloadImage(validUrl); }}
                  title="Preuzmi sliku"
                  type="button"
                >
                  <Download className="w-5 h-5 text-gray-700" />
                </button>
              )}
              <div
                className="w-full h-full cursor-pointer"
                onClick={() => setFullView(validUrl)}
                style={{ backgroundImage: `url('${validUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                title="Klikni za prikaz u punoj veličini"
              />
            </div>
          );
        })}
      </div>
      {fullView && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFullView(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={fullView && fullView.trim() !== "" ? fullView : "/no-image-uploaded.png"}
              alt="Slika gosta"
              className="object-contain w-full h-full rounded-2xl bg-white p-2 shadow-2xl"
              style={{ maxWidth: '90vw', maxHeight: '85vh' }}
            />
            {/* X za zatvaranje u gornjem desnom uglu */}
            <div className="absolute right-4 z-30 flex items-center justify-center" style={{ top: 'calc(1rem + 20px)' }}>
              <button
                onClick={e => { e.stopPropagation(); setFullView(null); }}
                title="Zatvori prikaz"
                type="button"
                className="bg-white/80 hover:bg-red-100 border border-gray-200 rounded-full shadow-lg p-2 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <span className="sr-only">Zatvori</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-red-500 hover:text-red-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Download dugme u donjem desnom uglu */}
            <div className="absolute right-4 z-30 flex items-center justify-center" style={{ bottom: 'calc(1rem + 20px)' }}>
              <button
                onClick={e => { e.stopPropagation(); downloadImage(fullView); }}
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
