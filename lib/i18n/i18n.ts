import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Cookies from 'js-cookie';

// Importiranje prijevoda
import srTranslation from '../../locales/sr/translation.json';
import enTranslation from '../../locales/en/translation.json';

// Sprječavanje višestruke inicijalizacije
if (!i18n.isInitialized) {
  console.log('Inicijalizacija i18n...');

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: process.env.NODE_ENV === 'development',
      initAsync: true,
      fallbackLng: 'sr',
      resources: {
        sr: {
          translation: srTranslation
        },
        en: {
          translation: enTranslation
        }
      },
      detection: {
        order: ['path', 'cookie', 'localStorage', 'navigator'],
        lookupFromPathIndex: 0,
        lookupCookie: 'i18nextLng',
        caches: ['cookie', 'localStorage']
      },
      react: {
        useSuspense: false
      },
      interpolation: {
        escapeValue: false,  // Nije potrebno za React
      },
    }).then(() => {
      console.log('Prijevodi učitani:', i18n.options.resources);
    }).catch(error => {
      console.error('Greška pri inicijalizaciji i18n:', error);
    });
}

// Funkcija za promjenu jezika koja također ažurira kolačić
export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  Cookies.set('i18nextLng', lng, { expires: 365, path: '/' });
};

export default i18n;
