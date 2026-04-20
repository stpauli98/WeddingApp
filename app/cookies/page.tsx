import Link from 'next/link';
import { LegalLocaleNotice } from '@/components/LegalLocaleNotice';

export const metadata = {
  title: 'Politika kolačića | DodajUspomenu',
  description: 'Kako koristimo kolačiće.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/cookies' },
};

export default function CookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <LegalLocaleNotice />
        <h1>Politika kolačića</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>Strogo neophodni (bez pristanka)</h2>
        <table>
          <thead><tr><th>Ime</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>admin_session</td><td>Autentikacija admina</td><td>7 dana</td></tr>
            <tr><td>guest_session</td><td>Autentikacija gosta</td><td>30 dana</td></tr>
            <tr><td>csrf_token_*</td><td>CSRF zaštita</td><td>30 min</td></tr>
            <tr><td>i18nextLng</td><td>Izbor jezika</td><td>1 godina</td></tr>
            <tr><td>cookie_consent_v1</td><td>Čuva vaš izbor</td><td>12 meseci</td></tr>
          </tbody>
        </table>

        <h2>Analitički (uz pristanak)</h2>
        <table>
          <thead><tr><th>Ime</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>_ga</td><td>Google Analytics — korisnik</td><td>2 godine</td></tr>
            <tr><td>_ga_*</td><td>Google Analytics — session</td><td>2 godine</td></tr>
          </tbody>
        </table>

        <h2>Kako upravljati</h2>
        <p>Brisanjem <code>cookie_consent_v1</code> iz browser storage-a banner se opet prikazuje.</p>

        <p>Vidi: <Link href="/privacy">Privatnost</Link>, <Link href="/terms">Uslovi</Link>.</p>
      </article>
    </main>
  );
}
