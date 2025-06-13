"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface LogoutButtonProps {
  label?: string
  language?: string
  eventSlug?: string
}

export function LogoutButton({ language = 'sr', eventSlug }: LogoutButtonProps = {}) {
  const router = useRouter();

  const handleLogout = () => {
    // Brisem session cookie
    fetch("/api/guest/logout", { method: "POST" })
    
    // Ako imamo eventSlug, preusmjeri na guest login stranicu s tim eventSlug parametrom
    if (eventSlug) {
      router.replace(`/${language}/guest/login?event=${eventSlug}`)
    } else {
      // Ako nemamo eventSlug, pokušaj dohvatiti iz localStorage
      if (typeof window !== 'undefined') {
        const storedEventSlug = localStorage.getItem('eventSlug')
        if (storedEventSlug) {
          router.replace(`/${language}/guest/login?event=${storedEventSlug}`)
          return
        }
      }
      // Ako ni to ne uspije, vrati na početnu stranicu
      router.replace(`/${language}`)
    }
  };

  // Prijevodi za gumb za odjavu
  const translations = {
    sr: "Odjavi se",
    en: "Log out"
  };

  return (
    <Button className="w-full" onClick={handleLogout}>
      {translations[language as keyof typeof translations] || translations.sr}
    </Button>
  );
} 
