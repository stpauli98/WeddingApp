'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      .catch(() => setError('Greška pri učitavanju'));
  }, [router]);

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
        setError(data.error || 'Greška');
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setLoading(false);
    }
  }

  async function cancelEvent() {
    if (!confirm('Sigurno otkažeš događaj? URL će biti oslobođen i ne možeš ga vratiti.')) return;
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
        setError(data.error || 'Greška pri otkazivanju');
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setLoading(false);
    }
  }

  if (error && !eventInfo) {
    return <div className="container mx-auto py-12 max-w-xl text-red-600">{error}</div>;
  }
  if (!eventInfo) return <div className="container mx-auto py-12 max-w-xl">Učitavanje...</div>;

  return (
    <div className="container mx-auto py-12 max-w-xl">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h1 className="text-2xl font-bold">Plaćanje na čekanju</h1>
          <p>
            Tvoj događaj <strong>{eventInfo.coupleName}</strong> ({eventInfo.pricingTier}) je rezervisan. Završi
            plaćanje da bi aktivirao admin dashboard.
          </p>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Button onClick={payNow} disabled={loading}>
              {loading ? 'Učitava...' : 'Plati sad'}
            </Button>
            <Button variant="outline" onClick={cancelEvent} disabled={loading}>
              Otkaži događaj
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
