"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";

export default function SessionPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Provjeri postoji li guestId i eventSlug u localStorage
    const guestId = localStorage.getItem("guestId");
    const eventSlug = localStorage.getItem("eventSlug");
    
    // Dohvati trenutni jezik iz URL-a koristeći utility funkciju
    const currentLanguage = getCurrentLanguageFromPath();
    
    // Provjeri je li trenutna putanja dashboard stranica (s ili bez jezičnog prefiksa)
    // Koristimo regex za provjeru da li putanja završava s /guest/dashboard, bez obzira na jezični prefiks
    const isDashboardPage = /\/(sr|en)\/guest\/dashboard$/.test(window.location.pathname) || 
                          window.location.pathname === "/guest/dashboard";
    
    if (guestId && eventSlug && !isDashboardPage) {
      // Preusmjeri na dashboard s jezičnim prefiksom
      router.replace(`/${currentLanguage}/guest/dashboard?event=${eventSlug}`);
    }
  }, [router, searchParams, i18n.language]);

  return null;
}
