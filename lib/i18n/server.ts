// lib/i18n/server.ts
// Server-only sync i18next factory. Returns a `t` function bound to a specific locale.
// Does not share state with the client `lib/i18n/i18n.ts` instance — each call creates
// a fresh, isolated instance so concurrent server renders for different locales cannot
// interfere (resolves the SSR /en-flash-to-SR caveat noted as followup in PR #11).
import i18next, { type TFunction } from 'i18next';
import srTranslation from '@/locales/sr/translation.json';
import enTranslation from '@/locales/en/translation.json';

export type SupportedLocale = 'sr' | 'en';

const resources = {
  sr: { translation: srTranslation },
  en: { translation: enTranslation },
} as const;

export function getServerT(locale: SupportedLocale): TFunction {
  const instance = i18next.createInstance();
  instance.init({
    lng: locale,
    fallbackLng: 'sr',
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance.t.bind(instance);
}
