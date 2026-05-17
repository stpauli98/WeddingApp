'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type TierInfo = { tier: 'basic' | 'premium'; label: string; description: string };

const OPTIONS_FROM_FREE: TierInfo[] = [
  { tier: 'basic', label: 'Basic — €25', description: '7 slika po gostu, 30 dana čuvanja' },
  { tier: 'premium', label: 'Premium — €75', description: '25 slika po gostu, najbolji kvalitet, 30 dana čuvanja' },
];
const OPTIONS_FROM_BASIC: TierInfo[] = [
  { tier: 'premium', label: 'Premium — €50 (razlika)', description: 'Plati razliku, dobijaš sve premium funkcije' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d?.event) {
          router.replace('/admin/event');
          return;
        }
        if (d.event.pricingTier === 'premium') {
          router.replace(`/admin/dashboard/${d.event.id}`);
          return;
        }
        if (!d.event.activatedAt) {
          router.replace('/admin/event/pending');
          return;
        }
        setCurrentTier(d.event.pricingTier);
        setEventId(d.event.id);
      })
      .catch(() => setError('Greška pri učitavanju'));
  }, [router]);

  async function buy(toTier: 'basic' | 'premium') {
    setLoading(toTier);
    setError(null);
    try {
      const csrfRes = await fetch('/api/admin/events/upgrade');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/admin/events/upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ toTier }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Greška');
        setLoading(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mrežna greška');
      setLoading(null);
    }
  }

  if (error && !currentTier) {
    return <div className="container mx-auto py-12 max-w-xl text-red-600">{error}</div>;
  }
  if (!currentTier) return <div className="container mx-auto py-12 max-w-xl">Učitavanje...</div>;

  const options = currentTier === 'free' ? OPTIONS_FROM_FREE : OPTIONS_FROM_BASIC;

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Nadogradnja paketa</h1>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <div className="grid gap-4">
        {options.map((opt) => (
          <Card key={opt.tier}>
            <CardContent className="flex justify-between items-center py-6 gap-4">
              <div>
                <div className="font-semibold">{opt.label}</div>
                <div className="text-sm text-muted-foreground">{opt.description}</div>
              </div>
              <Button onClick={() => buy(opt.tier)} disabled={loading !== null}>
                {loading === opt.tier ? 'Učitava...' : 'Plati'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com.
      </p>
      <div className="mt-6">
        {eventId && (
          <a href={`/admin/dashboard/${eventId}`} className="text-sm underline">
            &larr; Nazad na dashboard
          </a>
        )}
      </div>
    </div>
  );
}
