// Public unsubscribe landing — reachable as /unsubscribe or /sr/unsubscribe
// or /en/unsubscribe via middleware rewrite.
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main style={{ maxWidth: 560, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
        <h1>Link je nepotpun</h1>
        <p>Nedostaje token u URL-u. Molimo koristi link iz email poruke.</p>
      </main>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dodajuspomenu.com';
  let ok = false;
  let reason = '';
  try {
    const res = await fetch(`${base}/api/unsubscribe?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    ok = !!data.ok;
    reason = data.reason || '';
  } catch {
    reason = 'network';
  }

  return (
    <main style={{ maxWidth: 560, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>{ok ? 'Odjavljen/a si' : 'Odjava nije uspjela'}</h1>
      <p>
        {ok
          ? 'Nećeš više dobijati promotivne poruke od DodajUspomenu.com. Ako promijeniš mišljenje, slobodno nam se javi.'
          : reason === 'already unsubscribed or invalid'
            ? 'Link je već iskorišten ili nije valjan.'
            : 'Došlo je do greške. Pokušaj ponovo kasnije.'}
      </p>
    </main>
  );
}
