'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';
import { getCurrentLanguageFromPath } from '@/lib/utils/language';

interface I18nProviderProps {
  children: ReactNode;
}

export default function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const langFromPath = getCurrentLanguageFromPath();
    if (i18n.language !== langFromPath) {
      i18n.changeLanguage(langFromPath);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
