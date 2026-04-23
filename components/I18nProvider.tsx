'use client';

import { ReactNode, useState } from 'react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import srTranslation from '@/locales/sr/translation.json';
import enTranslation from '@/locales/en/translation.json';

/**
 * Per-render i18next instance. Eliminates the cross-request pollution bug
 * that haunted the shared singleton in `lib/i18n/i18n.ts`: on the server,
 * one request's `changeLanguage` call would mutate the shared module-level
 * state, and the next request's SSR would render with whatever language
 * was last set — causing hydration mismatches across /sr/... and /en/...
 * URLs whenever requests for different locales interleaved.
 *
 * The provider accepts `locale` as an explicit prop (set server-side in
 * `app/layout.tsx` from the URL) and seeds a fresh i18next instance with
 * `lng: locale`. Server and client render with the same instance seed,
 * guaranteeing identical output. `key={locale}` in the consumer forces
 * remount on locale change, which seeds a new instance without mutation.
 */

export type SupportedLocale = 'sr' | 'en';

interface I18nProviderProps {
  children: ReactNode;
  locale: SupportedLocale;
}

const resources = {
  sr: { translation: srTranslation },
  en: { translation: enTranslation },
} as const;

function createI18nInstance(locale: SupportedLocale): I18nInstance {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'sr',
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

export default function I18nProvider({ children, locale }: I18nProviderProps) {
  const [instance] = useState(() => createI18nInstance(locale));
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
