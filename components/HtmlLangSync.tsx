'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';

// Keeps <html lang> and i18next language aligned with the current URL prefix.
// RootLayout is a server component so it cannot observe path changes directly.
export function HtmlLangSync() {
  const { i18n } = useTranslation();
  const pathname = usePathname();

  useEffect(() => {
    const pathLang = pathname?.startsWith('/en') ? 'en' : 'sr';
    if (document.documentElement.lang !== pathLang) {
      document.documentElement.lang = pathLang;
    }
    if (i18n.language !== pathLang) {
      i18n.changeLanguage(pathLang);
    }
  }, [pathname, i18n]);

  return null;
}
