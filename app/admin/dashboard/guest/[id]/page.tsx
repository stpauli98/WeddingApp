"use client";

import { useEffect, useState } from "react";
import { getGuestFromCache, setGuestInCache } from "@/lib/guestCache";
import { useRouter } from "next/navigation";
import { AdminImageGallery } from "../../../../../components/admin/AdminImageGallery";
import { formatDate } from "@/lib/formatDate";
import { GuestMessage } from "@/components/guest/GuestMessage";
import type { GuestDetail } from "@/components/ui/types";

export default function GuestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [zipSelectedLoading, setZipSelectedLoading] = useState(false);

  // Handler za download selektovanih slika
  const handleDownloadSelected = async () => {
    if (!guest || selectedImageIds.length === 0) return;
    setZipSelectedLoading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let validCount = 0;
      for (let idx = 0; idx < guest.images.length; idx++) {
        const img = guest.images[idx];
        if (!selectedImageIds.includes(img.id)) continue;
        try {
          if (typeof img.imageUrl !== 'string') continue;
          // Base64?
          const match = img.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] || 'jpg';
            const base64 = match[2];
            zip.file(`slika_${idx + 1}.${ext}`, base64, { base64: true });
            validCount++;
            continue;
          }
          // URL?
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
        setZipSelectedLoading(false);
        return;
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gost_${guest.firstName}_${guest.lastName}_selektovane_slike.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    } finally {
      setZipSelectedLoading(false);
    }
  };


  // Funkcija za fetch podataka (koristi se i za refresh)
  const fetchGuest = (force = false) => {
    // Ako nije force refresh, proveri keš
    if (!force) {
      const cached = getGuestFromCache(id);
      if (cached) {
        setGuest(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    fetch(`/api/admin/guest/${id}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Nepoznata greška.");
          setGuest(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setGuest(data);
        setGuestInCache(id, data); // upiši u keš
        setLoading(false);
      })
      .catch(() => {
        setError("Greška pri komunikaciji sa serverom.");
        setGuest(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          <div className="text-gray-500 mt-2">Učitavanje podataka o gostu...</div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow border p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">{error === "NOT_FOUND" ? "Gost nije pronađen" : error || "Greška"}</h1>
          <button
            type="button"
            onClick={() => router.replace("/admin/dashboard")}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Nazad na dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 md:p-10 bg-white rounded-xl shadow border">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 border text-yellow-600 text-2xl font-bold">
          {guest.firstName?.[0]}{guest.lastName?.[0]}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-yellow-700">{guest.firstName} {guest.lastName}</div>
          <div className="text-gray-500 text-sm">{guest.email}</div>
        </div>
      </div>
      {/* Info sekcija */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 flex flex-col items-start shadow-sm border">
          <span className="text-xs text-gray-500 mb-1">Prijavljen</span>
          <span className="font-semibold text-gray-700">{formatDate(guest.createdAt)}</span>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 flex flex-col items-start shadow-sm border">
          <span className="text-xs text-gray-500 mb-1">Broj slika</span>
          <span className="font-semibold text-gray-700">{guest.images.length}</span>
        </div>
      </div>
      {/* Poruka gosta */}
      <div className="mb-8">
        <div className="mb-2 text-sm text-gray-500 font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Poruka gosta
        </div>
        {guest.message && guest.message.text ? (
          <GuestMessage message={{ text: guest.message.text }} />
        ) : (
          <div className="italic text-gray-400 border rounded-lg p-4 bg-gray-50">Gost nije ostavio poruku.</div>
        )}
      </div>
      {/* Galerija slika */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" /><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" /><path d="M21 19l-5.5-6.5a2 2 0 0 0-3 0L3 19" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            Slike gosta
          </div>
          {/* Dugme za preuzimanje svih slika */}
          {guest.images.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                setZipLoading(true);
                try {
                  const JSZip = (await import('jszip')).default;
                  const zip = new JSZip();
                  let validCount = 0;
                  for (let idx = 0; idx < guest.images.length; idx++) {
                    const img = guest.images[idx];
                    try {
                      if (typeof img.imageUrl !== 'string') continue;
                      // Base64?
                      const match = img.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
                      if (match) {
                        const ext = match[1] || 'jpg';
                        const base64 = match[2];
                        zip.file(`slika_${idx + 1}.${ext}`, base64, { base64: true });
                        validCount++;
                        continue;
                      }
                      // URL?
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
                    setZipLoading(false);
                    return;
                  }
                  const blob = await zip.generateAsync({ type: "blob" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `gost_${guest.firstName}_${guest.lastName}_slike.zip`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                    a.remove();
                  }, 500);
                } finally {
                  setZipLoading(false);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow transition text-sm disabled:opacity-60"
              disabled={zipLoading}
            >
              {zipLoading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              )}
              Preuzmi sve slike
            </button>
          )}
        </div>
        {guest.images.length > 0 ? (
          <AdminImageGallery
            images={guest.images}
            selectable={true}
            selectedIds={selectedImageIds}
            onSelectChange={setSelectedImageIds}
            onDownloadSelected={handleDownloadSelected}
            downloadSelectedLoading={zipSelectedLoading}
          />
        ) : (
          <div className="italic text-gray-400 border rounded-lg p-4 bg-gray-50">Nema slika za ovog gosta.</div>
        )}
      </div>
      {/* Dugmad (ikone) */}
      <div className="flex gap-4 mt-2 justify-end">
        {/* Refresh dugme */}
        <button
          onClick={() => fetchGuest(true)}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-green-100 border border-green-300 text-green-700 hover:bg-green-600 hover:text-white transition disabled:opacity-60 shadow"
          disabled={loading}
          aria-label="Osveži podatke"
        >
          {loading ? (
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /></svg>
          )}
          <span className="absolute bottom-[-2.2rem] left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition">Osveži</span>
        </button>
        {/* Povratak na dashboard */}
        <button
          type="button"
          onClick={() => router.replace("/admin/dashboard")}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white transition shadow"
          aria-label="Nazad na dashboard"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l7-7v4h7v6h-7v4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="absolute bottom-[-2.2rem] left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition">Dashboard</span>
        </button>
      </div>
    </div>
  );
}
