'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PendingEventInfo {
  id: string;
  coupleName: string;
  pricingTier: string;
  activatedAt: string | null;
}

export default function PendingPaymentPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [eventInfo, setEventInfo] = useState<PendingEventInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.event) {
          router.replace('/admin/event');
          return;
        }
        if (data.event.activatedAt) {
          router.replace(`/admin/dashboard/${data.event.id}`);
          return;
        }
        setEventInfo(data.event);
      })
      .catch(() => setError(t('admin.pending.errorLoading')));
  }, [router, t]);

  async function payNow() {
    setLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch('/api/admin/events/pending-checkout');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/admin/events/pending-checkout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken, 'content-type': 'application/json' },
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || t('admin.pending.error'));
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.pending.networkError'));
      setLoading(false);
    }
  }

  async function cancelEvent() {
    if (!confirm(t('admin.pending.cancelConfirm'))) return;
    setLoading(true);
    try {
      const csrfRes = await fetch('/api/admin/events/cancel-pending');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/admin/events/cancel-pending', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      if (res.ok) {
        router.replace('/admin/event');
      } else {
        const data = await res.json();
        setError(data.error || t('admin.pending.cancelError'));
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.pending.networkError'));
      setLoading(false);
    }
  }

  if (error && !eventInfo) {
    return <div className="container mx-auto py-12 max-w-xl text-red-600">{error}</div>;
  }
  if (!eventInfo) return <div className="container mx-auto py-12 max-w-xl">{t('admin.pending.loading')}</div>;

  return (
    <div className="container mx-auto py-12 max-w-xl">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h1 className="text-2xl font-bold">{t('admin.pending.title')}</h1>
          <p>
            {t('admin.pending.description', {
              coupleName: eventInfo.coupleName,
              tier: eventInfo.pricingTier,
            })}
          </p>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Button onClick={payNow} disabled={loading}>
              {loading ? t('admin.pending.loadingState') : t('admin.pending.payNow')}
            </Button>
            <Button variant="outline" onClick={cancelEvent} disabled={loading}>
              {t('admin.pending.cancel')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('admin.pending.refundFooter')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
