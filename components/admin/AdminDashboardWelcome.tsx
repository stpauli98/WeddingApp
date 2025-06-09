"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";

interface AdminDashboardWelcomeProps {
  eventLanguage?: string;
}

export default function AdminDashboardWelcome({ eventLanguage }: AdminDashboardWelcomeProps) {
  const { t } = useTranslation();
  
  // Detektiramo jezik iz URL-a ako nije proslijeđen
  const urlLanguage = getCurrentLanguageFromPath();
  
  // Koristimo jezik eventa ako je proslijeđen, inače koristimo jezik iz URL-a
  const language = eventLanguage || urlLanguage;
  
  // Prijevodi za poruku dobrodošlice
  const welcomeMessages = {
    sr: "Uživajte u vašim sličicama",
    en: "Enjoy your photos"
  };
  
  // Prikazujemo poruku na odgovarajućem jeziku
  return (
    <div className="text-center text-lg text-[hsl(var(--lp-muted-foreground))] mb-8">
      {welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages.sr}
    </div>
  );
}
