import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Cookies from 'js-cookie';

import srTranslation from '../../locales/sr/translation.json';
import enTranslation from '../../locales/en/translation.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: process.env.NODE_ENV === 'development',
      fallbackLng: 'sr',
      resources: {
        sr: { translation: srTranslation },
        en: { translation: enTranslation },
      },
      detection: {
        order: ['path', 'cookie', 'localStorage', 'navigator'],
        // Index 1 — NOT 0. `pathname.split('/')` yields ['', 'sr', ...]:
        // segment 0 is the empty string, segment 1 is the locale. If you
        // change this to 0, the path detector silently fails and falls
        // through to the cookie, which causes a hydration mismatch on every
        // /sr/ or /en/ URL when the cookie holds a different value.
        // Regression-tested in __tests__/lib/i18n-config.test.ts.
        lookupFromPathIndex: 1,
        lookupCookie: 'i18nextLng',
        caches: ['cookie', 'localStorage'],
      },
      react: { useSuspense: false },
      interpolation: { escapeValue: false },
    });
}

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  Cookies.set('i18nextLng', lng, { expires: 365, path: '/' });
};

export default i18n;
