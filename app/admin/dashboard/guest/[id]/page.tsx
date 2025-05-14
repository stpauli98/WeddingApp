"use client";

import { useEffect, useState, use } from "react";
import { getGuestFromCache, setGuestInCache } from "@/lib/guestCache";
import { useRouter } from "next/navigation";
import { AdminImageGallery } from "../../../../../components/admin/AdminImageGallery";
import { formatDate } from "@/lib/formatDate";
import { GuestMessage } from "@/components/guest/GuestMessage";
import type { GuestDetail } from "@/components/ui/types";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getScrollPosition, restoreScrollPosition } from "@/lib/scrollPosition";

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

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
          <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          <div className="text-muted-foreground mt-2">Učitavanje podataka o gostu...</div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-xl shadow border p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">{error === "NOT_FOUND" ? "Gost nije pronađen" : error || "Greška"}</h1>
          <button
            type="button"
            onClick={() => router.replace("/admin/dashboard")}
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
          >
            Nazad na dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 md:p-10 bg-card rounded-xl shadow border">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border text-primary text-2xl font-bold">
          {guest.firstName?.[0]}{guest.lastName?.[0]}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-primary">{guest.firstName} {guest.lastName}</div>
        </div>
      </div>
      {/* Poruka gosta */}
      <div className="mb-8">
        <div className="mb-2 text-sm text-muted-foreground font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Poruka gosta
        </div>
        {guest.message && guest.message.text ? (
          <GuestMessage message={{ text: guest.message.text }} />
        ) : (
          <div className="italic text-muted-foreground border rounded-lg p-4 bg-muted">Gost nije ostavio poruku.</div>
        )}
      </div>
      
      {/* Galerija slika */}
      <div className="mb-8">
        {guest.images.length > 0 ? (
          <AdminImageGallery
            images={guest.images}
            selectedIds={selectedImageIds}
            onSelectChange={setSelectedImageIds}
            zipFileNamePrefix={`gost_${guest.firstName}_${guest.lastName}`}
            onBack={() => {
              router.replace("/admin/dashboard");
              // Vraćamo korisnika na sačuvanu poziciju skrola nakon navigacije
              // Dodajemo malo kašnjenje da se stranica prvo učita
              setTimeout(() => restoreScrollPosition(), 100);
            }}
          />
        ) : (
          <div className="italic text-muted-foreground border rounded-lg p-4 bg-muted">Gost nije uploadovao nijednu fotografiju.</div>
        )}
      </div>
    </div>
  );
}
