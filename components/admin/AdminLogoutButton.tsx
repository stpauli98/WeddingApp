"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"

interface AdminLogoutButtonProps {
  language?: string
}

export default function AdminLogoutButton({ language }: AdminLogoutButtonProps = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
      if (!response.ok) {
        // Loguj status i tekst greške za debug
        const text = await response.text();
        console.error("Logout API error:", response.status, text);
        // Koristimo prijevode za poruku o grešci
      const errorMessage = language === 'en' ? "Error logging out. Please try again." : "Greška pri odjavi. Pokušajte ponovo.";
      alert(errorMessage);
        setLoading(false);
        return;
      }
      router.replace("/admin/login");
    } catch (error) {
      console.error("Logout fetch error:", error);
      // Koristimo prijevode za poruku o mrežnoj grešci
      const networkErrorMessage = language === 'en' ? "Failed to log out (network error)." : "Neuspela odjava (network greška).";
      alert(networkErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Detekcija jezika iz URL-a ako nije eksplicitno proslijeđen
  // Direktno koristimo window.location.pathname za detekciju jezika
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const segments = pathname.split('/');
  const urlLanguage = segments.length > 1 && (segments[1] === 'en' || segments[1] === 'sr') ? segments[1] : 'sr';
  
  // Prioritet: 1. URL jezik, 2. Event jezik
  // Ovo osigurava da će jezik iz URL-a uvijek imati prednost
  const currentLanguage = urlLanguage || language || 'sr';
  
  // Prijevodi za gumb za odjavu
  const translations = {
    sr: {
      button: "Odjavi se",
      loading: "Odjava..."
    },
    en: {
      button: "Log out",
      loading: "Logging out..."
    }
  };

  // Dohvaćamo prijevode za trenutni jezik ili defaultno za srpski
  const t = translations[currentLanguage as keyof typeof translations] || translations.sr;

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-[hsl(var(--lp-accent))] bg-white/80 text-xs md:text-sm font-medium text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-muted))] hover:text-[hsl(var(--lp-accent))] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--lp-accent))] shadow-md md:shadow-lg fixed md:static top-4 right-4 md:top-auto md:right-auto z-30"
      style={{ minWidth: 'auto' }}
      aria-label="Logout"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 md:h-4 md:w-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {t.loading}
        </span>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-4 md:h-4 text-[hsl(var(--lp-accent))]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
          </svg>
          <span className="hidden md:inline">{t.button}</span>
        </>
      )}
    </button>
  );
}
