'use client';
import { useCallback, useEffect, useState } from 'react';

export type ConsentState = 'granted' | 'denied' | null;
const STORAGE_KEY = 'cookie_consent_v1';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function pushConsent(state: 'granted' | 'denied') {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'consent_update',
    consent: { analytics_storage: state, ad_storage: state, ad_user_data: state, ad_personalization: state },
  });
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: state,
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
    });
  }
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'granted' || stored === 'denied') {
        setConsent(stored);
        pushConsent(stored);
      }
    } catch { /* private mode */ }
  }, []);

  const accept = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch {}
    setConsent('granted');
    pushConsent('granted');
  }, []);

  const decline = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch {}
    setConsent('denied');
    pushConsent('denied');
  }, []);

  return { consent, accept, decline };
}
