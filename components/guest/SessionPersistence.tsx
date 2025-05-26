"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function SessionPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Provjeri postoji li guestId i eventSlug u localStorage
    const guestId = localStorage.getItem("guestId");
    const eventSlug = localStorage.getItem("eventSlug");
    
    // Dohvati trenutni jezik iz i18n ili koristi defaultni 'sr'
    const currentLanguage = i18n.language || 'sr';
    
    // Provjeri je li trenutna putanja dashboard stranica (s ili bez jezičnog prefiksa)
    const isDashboardPage = window.location.pathname === "/guest/dashboard" || 
                          window.location.pathname.endsWith("/guest/dashboard");
    
    if (guestId && eventSlug && !isDashboardPage) {
      // Preusmjeri na dashboard s jezičnim prefiksom
      router.replace(`/${currentLanguage}/guest/dashboard?event=${eventSlug}`);
    }
  }, [router, searchParams, i18n.language]);

  return null;
}
