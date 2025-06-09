"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface AdminDashboardWelcomeProps {
  eventLanguage?: string;
}

export default function AdminDashboardWelcome({ eventLanguage }: AdminDashboardWelcomeProps) {
  const { t } = useTranslation();
  
  // Detektiramo jezik iz URL-a ako nije proslijeđen
  // Direktno koristimo window.location.pathname za detekciju jezika
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const segments = pathname.split('/');
  const urlLanguage = segments.length > 1 && (segments[1] === 'en' || segments[1] === 'sr') ? segments[1] : 'sr';
  
  // Prioritet: 1. URL jezik, 2. Event jezik
  // Ovo osigurava da će jezik iz URL-a uvijek imati prednost
  const language = urlLanguage || eventLanguage || 'sr';
  
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
