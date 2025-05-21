'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  className?: string; // Dodajemo opcionalnu klasu za fleksibilnost pozicioniranja
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  
  // Koristimo useEffect kako bismo izbjegli probleme s hidracijom
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    
    // Pohrani odabrani jezik u localStorage
    try {
      localStorage.setItem('i18nextLng', lang);
    } catch (error) {
      console.error('Greška pri pohrani jezika u localStorage:', error);
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
    <div className={`flex space-x-2 bg-white/20 rounded-md p-1 shadow-md z-50 ${className}`}>
      <button 
        onClick={() => changeLanguage('sr')}
        className={`px-3 py-1 rounded font-medium transition-colors ${i18n.language === 'sr' ? 'bg-lp-accent text-white' : 'text-gray-800 hover:bg-gray-200'}`}
      >
        SR
      </button>
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded font-medium transition-colors ${i18n.language === 'en' ? 'bg-lp-accent text-white' : 'text-gray-800 hover:bg-gray-200'}`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSelector;
