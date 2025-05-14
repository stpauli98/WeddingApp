"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ImageData {
  id: string;
  imageUrl: string;
  createdAt: string | Date;
  guestName?: string;
}

interface AdminGalleryAllImagesProps {
  images: ImageData[];
}


const AdminGalleryAllImages: React.FC<AdminGalleryAllImagesProps> = ({ images }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  
  // Optimizacija sortiranja - samo jednom sortiramo slike pomoću useMemo
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [images]);

  const openModal = (idx: number) => {
    setCurrentIdx(idx);
    setModalOpen(true);
    // Preload susjedne slike za bolje iskustvo
    const preloadIndices = [
      (idx - 1 + sortedImages.length) % sortedImages.length,
      (idx + 1) % sortedImages.length
    ];
    preloadIndices.forEach(i => {
      if (sortedImages.length > 1) {
        const imgEl = new window.Image();
        imgEl.src = sortedImages[i].imageUrl;
      }
    });
  };

  const closeModal = () => setModalOpen(false);
  const prevImage = useCallback(() => setCurrentIdx(idx => (idx === 0 ? sortedImages.length - 1 : idx - 1)), [sortedImages.length]);
  const nextImage = useCallback(() => setCurrentIdx(idx => (idx === sortedImages.length - 1 ? 0 : idx + 1)), [sortedImages.length]);

  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };

  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, prevImage, nextImage]);

  // Funkcija za praćenje učitanih slika
  const handleImageLoad = (idx: number) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(idx);
      return newSet;
    });
  };

  // Efekt za praćenje učitavanja svih slika
  useEffect(() => {
    // Ako nema slika ili su sve učitane, prestani s učitavanjem
    if (sortedImages.length === 0 || loadedImages.size >= Math.min(4, sortedImages.length)) {
      setIsLoading(false);
    }
  }, [loadedImages, sortedImages.length]);
  
  // Sigurnosni tajmer koji će zaustaviti učitavanje nakon 3 sekunde
  // čak i ako slike nisu učitane
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!images.length) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center py-16 text-gray-400 rounded-lg bg-gray-50 border border-gray-100 shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 mb-6 opacity-40 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
          <path d="M21 19l-5.5-6.5a2 2 0 0 0-3 0L3 19" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="font-medium text-lg mb-3 text-gray-600">Nema uploadovanih slika</div>
        <div className="text-sm text-gray-500 max-w-md text-center">Kada gosti pošalju slike, ovdje će se pojaviti galerija za ovaj event.</div>
      </motion.div>
    );
  }
  return (
    <>
      {isLoading && (
        <div className="w-full flex justify-center items-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-yellow-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-yellow-600 font-medium">Učitavanje galerije...</p>
          </div>
        </div>
      )}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`}
        style={{ display: isLoading ? 'none' : 'grid' }}
      >
        {sortedImages.map((img, idx) => (
          <motion.div 
            key={img.id} 
            whileHover={{ scale: 1.03, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            transition={{ duration: 0.2 }}
            className="relative rounded-lg overflow-hidden shadow-md bg-white group cursor-pointer h-64"
            onClick={() => openModal(idx)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
            
            <Image
              src={img.imageUrl && img.imageUrl.trim() !== "" ? img.imageUrl : "/placeholder.png"}
              alt={img.guestName ? `Slika gosta: ${img.guestName}` : "Slika gosta"}
              width={400}
              height={400}
              priority={idx < 4}
              loading={idx < 4 ? "eager" : "lazy"}
              onLoad={() => handleImageLoad(idx)}
              title={img.guestName ? `Gost: ${img.guestName}` : undefined}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            
            <div className="absolute bottom-0 left-0 w-full p-3 z-20">
              {img.guestName && (
                <div className="text-white text-sm font-medium truncate bg-black/40 px-3 py-2 rounded-full backdrop-blur-sm">
                  {img.guestName}
                </div>
              )}
            </div>
            
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-yellow-400 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {new Date(img.createdAt).toLocaleDateString('sr-RS', {day: '2-digit', month: '2-digit'})}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
      <AnimatePresence>
        {modalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm min-h-screen"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative flex flex-col justify-center items-center h-full w-full"
              onTouchStart={(e: React.TouchEvent<HTMLDivElement>) => {
                if (e.touches.length === 1) {
                  (window as any)._touchStartX = e.touches[0].clientX;
                  (window as any)._touchStartY = e.touches[0].clientY;
                }
              }}
              onTouchEnd={(e: React.TouchEvent<HTMLDivElement>) => {
                const touchStartX = (window as any)._touchStartX;
                const touchStartY = (window as any)._touchStartY;
                if (typeof touchStartX !== "number" || typeof touchStartY !== "number") return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                  if (dx < 0) nextImage(); // swipe lijevo
                  else prevImage(); // swipe desno
                }
                (window as any)._touchStartX = undefined;
                (window as any)._touchStartY = undefined;
              }}
            >
              {/* Kontrole za navigaciju */}
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                onClick={closeModal} 
                className="absolute top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/10 transition z-10" 
                title="Zatvori" 
                aria-label="Zatvori prikaz slike"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.1, x: -5 }}
                onClick={prevImage} 
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-yellow-500 hover:text-white rounded-full w-12 h-12 flex items-center justify-center transition z-10" 
                title="Prethodna slika" 
                aria-label="Prethodna slika"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              
              {/* Prikaz slike */}
              <div className="flex items-center justify-center p-4">
                <div className="relative overflow-hidden rounded-lg">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Image
                        src={sortedImages[currentIdx].imageUrl}
                        alt={`Slika gosta${sortedImages[currentIdx].guestName ? ': ' + sortedImages[currentIdx].guestName : ''}`}
                        width={1200}
                        height={900}
                        priority
                        className="object-contain rounded-lg shadow-2xl max-h-[80vh]"
                        style={{ width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '80vh' }}
                        onLoad={() => {
                          // Dodatno optimiziramo učitavanje slike u modalnom prikazu
                          if (currentIdx < sortedImages.length - 1) {
                            const nextImg = new window.Image();
                            nextImg.src = sortedImages[(currentIdx + 1) % sortedImages.length].imageUrl;
                          }
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Kontrole za preuzimanje */}
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'var(--primary)' }}
                whileTap={{ scale: 0.95 }}
                aria-label="Preuzmi ovu sliku"
                onClick={async () => {
                  const img = sortedImages[currentIdx];
                  let blob: Blob;
                  let filename = `slika_${img.id}.jpg`;
                  
                  try {
                    if (img.imageUrl.startsWith("data:")) {
                      // Base64 data URL
                      const arr = img.imageUrl.split(",");
                      const match = arr[0].match(/:(.*?);/);
                      const mime = match ? match[1] : "image/jpeg";
                      const bstr = atob(arr[1]);
                      let n = bstr.length;
                      const u8arr = new Uint8Array(n);
                      while (n--) u8arr[n] = bstr.charCodeAt(n);
                      blob = new Blob([u8arr], { type: mime });
                    } else {
                      // Remote URL (fetch as blob)
                      const res = await fetch(img.imageUrl);
                      if (!res.ok) throw new Error('Greška pri preuzimanju slike');
                      blob = await res.blob();
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }, 200);
                  } catch (error) {
                    console.error('Greška pri preuzimanju:', error);
                    alert('Došlo je do greške pri preuzimanju slike. Molimo pokušajte ponovo.');
                  }
                }}
                className="fixed md:absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 bg-white hover:bg-yellow-400 text-yellow-700 hover:text-yellow-800 rounded-full p-3 shadow-xl transition-all duration-300 flex items-center gap-2"
                title="Preuzmi ovu sliku"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                <span className="hidden md:inline">Preuzmi</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.1, x: 5 }}
                onClick={nextImage} 
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-yellow-500 hover:text-white rounded-full w-12 h-12 flex items-center justify-center transition z-10" 
                title="Sledeća slika" 
                aria-label="Sledeća slika"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
              
              {/* Info o gostu */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-white text-base bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{sortedImages[currentIdx].guestName || "Nepoznat gost"}</span>
                <span className="text-xs text-gray-300 ml-2">
                  {new Date(sortedImages[currentIdx].createdAt).toLocaleDateString('sr-RS', {
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </motion.div>
              
              {/* Indikator pozicije */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {sortedImages.length > 1 && (
                  <div className="flex items-center justify-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                    {sortedImages.length <= 10 ? (
                      // Prikazujemo sve indikatore ako ih je manje od 10
                      sortedImages.map((_, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setCurrentIdx(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentIdx === idx ? 'bg-yellow-400 w-4' : 'bg-white/50 hover:bg-white'}`}
                          aria-label={`Prijeđi na sliku ${idx + 1}`}
                        />
                      ))
                    ) : (
                      // Prikazujemo samo nekoliko indikatora oko trenutne slike ako ih je više od 10
                      sortedImages.map((_, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setCurrentIdx(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentIdx === idx ? 'bg-yellow-400 w-4' : 'bg-white/50 hover:bg-white'}`}
                          aria-label={`Prijeđi na sliku ${idx + 1}`}
                        />
                      )).slice(Math.max(0, currentIdx - 2), Math.min(sortedImages.length, currentIdx + 3))
                    )}
                    <span className="text-xs text-white/70 ml-2">{currentIdx + 1}/{sortedImages.length}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
   );
};

export default AdminGalleryAllImages;
