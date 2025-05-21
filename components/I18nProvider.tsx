'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';

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
