'use client';

import { useEffect, useState } from 'react';

// Self-contained translations — decoupled from the global i18n singleton
// to avoid SSR/client hydration mismatches. The skip link is a11y-only;
// pulling it into the i18n resource system created a race where the
// server rendered the language from whichever request warmed the i18n
// singleton first, while the client LanguageDetector resolved a
// potentially different value (see path / cookie / localStorage order).
const COPY = {
  sr: 'Preskoči na glavni sadržaj',
  en: 'Skip to main content',
} as const;

type Lang = keyof typeof COPY;

export function SkipLink() {
  // Render SR on the first pass — matches <html lang="sr"> hardcoded in
  // RootLayout so SSR and client hydration agree. After mount we read the
  // live document.documentElement.lang (updated by HtmlLangSync on EN
  // routes) and switch if needed. This happens after hydration, so React
  // treats it as a normal state update rather than a mismatch.
  const [lang, setLang] = useState<Lang>('sr');

  useEffect(() => {
    const htmlLang = document.documentElement.lang;
    if (htmlLang === 'en' || htmlLang === 'sr') {
      setLang(htmlLang);
    }
  }, []);

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only absolute top-2 left-2 bg-primary text-white px-4 py-2 rounded z-50"
    >
      {COPY[lang]}
    </a>
  );
}
