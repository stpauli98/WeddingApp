'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';
import { getCurrentLanguageFromPath } from '@/lib/utils/language';

interface I18nProviderProps {
  children: ReactNode;
}

// Globalna varijabla za praćenje inicijalizacije
let isI18nInitialized = false;

export default function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const initI18n = async () => {
      // Inicijaliziramo i18n samo jednom
      if (!isI18nInitialized && !i18n.isInitialized) {
        try {
          await i18n.init();
          isI18nInitialized = true;
        } catch (error) {
          console.error('Greška pri inicijalizaciji i18n:', error);
        }
      }

      // Detektiraj jezik iz URL-a koristeći utility funkciju
      if (typeof window !== 'undefined') {
        const langFromPath = getCurrentLanguageFromPath();
        if (i18n.language !== langFromPath) {
          console.log(`Postavljanje jezika iz URL-a: ${langFromPath}`);
          i18n.changeLanguage(langFromPath);
        }
      }

      setIsReady(true);
    };

    initI18n();
  }, []);

  // Ako komponenta nije montirana ili i18n nije spreman, vraćamo null
  if (!isMounted || !isReady) {
    return null; // Ili neki loading indikator
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
