'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string; // Dodajemo opcionalnu klasu za fleksibilnost pozicioniranja
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  
  // Koristimo useEffect kako bismo izbjegli probleme s hidracijom
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const changeLanguage = async (lang: string) => {
    // Sprečava multiple clicks
    if (isChanging) return;
    
    setIsChanging(true);
    
    try {
      await i18n.changeLanguage(lang);
      
      // Pohrani odabrani jezik u localStorage
      try {
        localStorage.setItem('i18nextLng', lang);
      } catch (error) {
        console.error('Greška pri pohrani jezika u localStorage:', error);
      }
      
      // Promijeni URL da sadrži novi jezični prefiks
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(segment => segment);
        
        // Ako je prvi segment jezika, zamijeni ga s novim jezikom
        if (pathSegments.length > 0 && ['sr', 'en'].includes(pathSegments[0])) {
          pathSegments[0] = lang;
        } else {
          // Inače dodaj novi jezik na početak
          pathSegments.unshift(lang);
        }
        
        // Konstruiraj novi URL i preusmjeri
        const newPath = `/${pathSegments.join('/')}`;
        router.push(newPath);
      }
    } catch (error) {
      console.error('Greška pri promjeni jezika:', error);
      setIsChanging(false);
    }
  };

  // Ako komponenta nije montirana, prikazujemo istu strukturu ali bez dinamičkih klasa
  // Ovo osigurava da se server i klijent renderiranje podudaraju
  if (!mounted) {
    return (
      <div className={`flex space-x-2 bg-white/20 rounded-md p-1 shadow-md z-50 ${className}`}>
        <button className="px-3 py-1 rounded font-medium transition-colors text-gray-800">SR</button>
        <button className="px-3 py-1 rounded font-medium transition-colors text-gray-800">EN</button>
      </div>
    );
  }

  // Nakon montiranja, prikazujemo punu funkcionalnost s dinamičkim klasama
  return (
    <>
      {/* Loading overlay s backdrop blur */}
      {isChanging && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--lp-primary))]" />
            <p className="text-sm font-medium text-[hsl(var(--lp-text))]">
              {i18n.language === 'sr' ? 'Učitavanje...' : 'Loading...'}
            </p>
          </div>
        </div>
      )}
      
      <div className={`flex space-x-2 bg-white/20 rounded-md p-1 shadow-md z-50 ${className}`}>
        <button 
          onClick={() => changeLanguage('sr')}
          disabled={isChanging}
          className={`px-3 py-1 rounded font-medium transition-colors ${i18n.language === 'sr' ? 'bg-lp-accent text-white' : 'text-gray-800 hover:bg-gray-200'} ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          SR
        </button>
        <button 
          onClick={() => changeLanguage('en')}
          disabled={isChanging}
          className={`px-3 py-1 rounded font-medium transition-colors ${i18n.language === 'en' ? 'bg-lp-accent text-white' : 'text-gray-800 hover:bg-gray-200'} ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          EN
        </button>
      </div>
    </>
  );
};

export default LanguageSelector;
