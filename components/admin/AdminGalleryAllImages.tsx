"use client";
import React, { useState, useCallback, useEffect } from "react";

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
  const sortedImages = images.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openModal = (idx: number) => {
    setCurrentIdx(idx);
    setModalOpen(true);
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

  if (!images.length) {
    return (
      <div className="text-center text-gray-400 italic py-12">Nema uploadovanih slika.</div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {sortedImages.map((img, idx) => (
          <div key={img.id} className="relative rounded overflow-hidden shadow bg-white group cursor-pointer" onClick={() => openModal(idx)}>
            <div
              className="w-full h-40 bg-center bg-cover transition-transform group-hover:scale-105"
              style={{ backgroundImage: `url('${img.imageUrl}')` }}
              title={img.guestName ? `Gost: ${img.guestName}` : undefined}
            />
            {img.guestName && (
              <div className="absolute bottom-0 left-0 w-full bg-black/40 text-white text-xs px-2 py-1 truncate">
                {img.guestName}
              </div>
            )}
          </div>
        ))}
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 min-h-screen">
          <div
            className="relative flex flex-col justify-center items-center h-full w-full"
            onTouchStart={e => {
              if (e.touches.length === 1) {
                (window as any)._touchStartX = e.touches[0].clientX;
                (window as any)._touchStartY = e.touches[0].clientY;
              }
            }}
            onTouchEnd={e => {
              const touchStartX = (window as any)._touchStartX;
              const touchStartY = (window as any)._touchStartY;
              if (typeof touchStartX !== "number" || typeof touchStartY !== "number") return;
              const dx = e.changedTouches[0].clientX - touchStartX;
              const dy = e.changedTouches[0].clientY - touchStartY;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) nextImage(); // swipe levo
                else prevImage(); // swipe desno
              }
              (window as any)._touchStartX = undefined;
              (window as any)._touchStartY = undefined;
            }}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 text-white text-3xl hover:text-yellow-400 transition z-10" title="Zatvori">&times;</button>
            <button onClick={prevImage} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-yellow-400 transition z-10" title="Prethodna slika">&#8592;</button>
            <img
              src={sortedImages[currentIdx].imageUrl}
              alt={sortedImages[currentIdx].guestName || "Slika gosta"}
              className="max-h-[80vh] max-w-[90vw] rounded shadow-lg border-4 border-white"
              style={{ background: "#eee" }}
            />
            <button
              onClick={async () => {
                const img = sortedImages[currentIdx];
                let blob: Blob;
                let filename = `slika_${img.id}.jpg`;
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
              }}
              className="fixed md:absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 bg-white/90 hover:bg-yellow-300 text-yellow-700 rounded-full p-3 shadow-lg transition"
              title="Preuzmi ovu sliku"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
            </button>
            <button onClick={nextImage} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-yellow-400 transition z-10" title="Sledeća slika">&#8594;</button>
            <div className="mt-4 text-white text-base bg-black/60 px-4 py-2 rounded">
              {sortedImages[currentIdx].guestName || "Nepoznat gost"}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminGalleryAllImages;
