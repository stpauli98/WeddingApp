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
        lookupFromPathIndex: 0,
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
