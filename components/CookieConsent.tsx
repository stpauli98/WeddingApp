'use client';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/hooks/useConsent';
import Link from 'next/link';

export function CookieConsent() {
  const { consent, accept, decline } = useConsent();
  const { t, i18n } = useTranslation();

  if (consent !== null) return null;
  const lang = i18n.language === 'en' ? 'en' : 'sr';

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h2 id="cookie-consent-title" className="font-semibold mb-1">
            {t('consent.title')}
          </h2>
          <p id="cookie-consent-desc" className="text-sm text-gray-600">
            {t('consent.body')}{' '}
            <Link href={`/${lang}/cookies`} className="underline">
              {t('consent.readMore')}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t('consent.decline')}
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
