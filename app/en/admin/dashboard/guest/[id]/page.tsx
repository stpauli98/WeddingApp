"use client";

import { useEffect, useState, use } from "react";
import { getGuestFromCache, setGuestInCache } from "@/lib/guestCache";
import { useRouter } from "next/navigation";
import { AdminImageGallery } from "@/components/admin/AdminImageGallery";
import { formatDate } from "@/lib/formatDate";
import { GuestMessage } from "@/components/guest/GuestMessage";
import type { GuestDetail } from "@/components/ui/types";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getScrollPosition, restoreScrollPosition } from "@/lib/scrollPosition";
import { useTranslation } from "react-i18next";
import I18nProvider from "@/components/I18nProvider";
import '@/lib/i18n/i18n'; // Osigurava da je i18n inicijaliziran

// Omotač komponenta koja koristi I18nProvider i prikazuje sadržaj na engleskom
function GuestDetailPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  
  // Osiguravamo da je jezik postavljen na engleski
  useEffect(() => {
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

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
          setError(data.error || "Unknown error");
          setGuest(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setGuest(data);
        setGuestInCache(id, data); // cache the data
        setLoading(false);
      })
      .catch(() => {
        setError("Error communicating with the server");
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
          <svg className="animate-spin w-8 h-8 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          <div className="text-[hsl(var(--lp-muted-foreground))] mt-2">Loading guest data...</div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow border border-[hsl(var(--lp-accent))]/20 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-[hsl(var(--lp-destructive))]">{error === "NOT_FOUND" ? t('admin.imageGallery.guestNotFound') : error || t('admin.imageGallery.error')}</h1>
          <button
            type="button"
            onClick={() => router.replace("/en/admin/dashboard")}
            className="inline-block px-4 py-2 bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] rounded hover:bg-[hsl(var(--lp-primary-hover))] transition"
          >
            {t('admin.imageGallery.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 md:p-10 bg-white rounded-xl shadow border">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[hsl(var(--lp-accent))]/20 border border-[hsl(var(--lp-accent))]/30 text-[hsl(var(--lp-accent))] text-2xl font-bold">
          {guest.firstName?.[0]}{guest.lastName?.[0]}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-[hsl(var(--lp-text))]">{guest.firstName} {guest.lastName}</div>
        </div>
      </div>
      {/* Guest message */}
      <div className="mb-8">
        <div className="mb-2 text-sm text-[hsl(var(--lp-muted-foreground))] font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-[hsl(var(--lp-accent))]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          {t('admin.imageGallery.guestMessage')}
        </div>
        {guest.message && guest.message.text ? (
          <GuestMessage message={{ text: guest.message.text }} />
        ) : (
          <div className="italic text-[hsl(var(--lp-muted-foreground))] border border-[hsl(var(--lp-accent))]/20 rounded-lg p-4 bg-[hsl(var(--lp-muted))]/10">{t('admin.imageGallery.noMessage')}</div>
        )}
      </div>
      
      {/* Image gallery */}
      <div className="mb-8">
        {guest.images.length > 0 ? (
          <AdminImageGallery
            images={guest.images}
            selectedIds={selectedImageIds}
            onSelectChange={setSelectedImageIds}
            zipFileNamePrefix={`guest_${guest.firstName}_${guest.lastName}`}
            onBack={() => {
              router.replace("/en/admin/dashboard");
              // Return the user to the saved scroll position after navigation
              // Add a small delay to ensure the page loads first
              setTimeout(() => restoreScrollPosition(), 100);
            }}
          />
        ) : (
          <div className="italic text-[hsl(var(--lp-muted-foreground))] border border-[hsl(var(--lp-accent))]/20 rounded-lg p-4 bg-[hsl(var(--lp-muted))]/10">{t('admin.imageGallery.noPhotos')}</div>
        )}
      </div>
    </div>
  );
}

// Glavna komponenta koja se renderira nakon što se parametri raspakiraju
export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <I18nProvider>
      <GuestDetailPageContent id={id} />
    </I18nProvider>
  );
}
