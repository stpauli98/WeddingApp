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

type ConsentUpdate = Record<string, 'granted' | 'denied'>;

const GRANTED_ANALYTICS_ONLY: ConsentUpdate = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

const ALL_DENIED: ConsentUpdate = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

function pushConsent(consentUpdate: ConsentUpdate) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'consent_update', consent: consentUpdate });
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', consentUpdate);
  }
}

export function useConsent() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'granted' || stored === 'denied') {
        setConsent(stored);
        pushConsent(stored === 'granted' ? GRANTED_ANALYTICS_ONLY : ALL_DENIED);
      }
    } catch { /* private mode */ }
    setMounted(true);
  }, []);

  const accept = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch {}
    setConsent('granted');
    pushConsent(GRANTED_ANALYTICS_ONLY);
  }, []);

  const decline = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch {}
    setConsent('denied');
    pushConsent(ALL_DENIED);
  }, []);

  return { consent, accept, decline, mounted };
}
