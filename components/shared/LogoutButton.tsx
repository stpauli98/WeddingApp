"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface LogoutButtonProps {
  label?: string
  language?: string
}

export function LogoutButton({ language = 'sr' }: LogoutButtonProps = {}) {
  const router = useRouter();

  const handleLogout = () => {
   //brisem session cookie i vrati na pocetnu stranu
   fetch("/api/guest/logout", { method: "POST" })
   router.replace("/")
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
