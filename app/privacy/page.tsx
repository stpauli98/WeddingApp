import Link from 'next/link';
import { LegalLocaleNotice } from '@/components/LegalLocaleNotice';

export const metadata = {
  title: 'Politika privatnosti | DodajUspomenu',
  description: 'Politika privatnosti platforme DodajUspomenu — kako obrađujemo lične podatke.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <LegalLocaleNotice />
        <h1>Politika privatnosti</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>1. Ko je kontrolor podataka</h2>
        <p>
          <strong>Next Pixel s.p.</strong><br />
          Jovana Dučića 15, 78400 Gradiška, Bosna i Hercegovina<br />
          JIB: 4513996760008<br />
          Email: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>
        </p>
        <p className="text-sm text-gray-600">
          Punu Impressum informaciju vidi na <Link href="/kontakt">/kontakt</Link>.
        </p>

        <h2>2. Koje podatke prikupljamo</h2>
        <ul>
          <li><strong>Mladenci (admin):</strong> email, ime, lozinka (hash), metapodaci venčanja.</li>
          <li><strong>Gosti:</strong> ime, email, fotografije, tekst čestitke.</li>
          <li><strong>Tehnički:</strong> IP adresa (za rate limiting), session token (httpOnly cookie).</li>
          <li><strong>Analitika:</strong> uz pristanak — Google Analytics 4 (anonimizovana IP).</li>
        </ul>

        <h2>3. Pravni osnov</h2>
        <ul>
          <li>Izvršenje ugovora (Art. 6(1)(b) GDPR).</li>
          <li>Legitimni interes (Art. 6(1)(f)) — sigurnost i rate-limiting.</li>
          <li>Pristanak (Art. 6(1)(a)) — za analitiku.</li>
        </ul>

        <h2>4. Retention</h2>
        <p>Fotografije i čestitke se brišu 30 dana nakon datuma venčanja. Admin metapodaci ostaju dok mladenci ne zatraže brisanje.</p>

        <h2>5. Sa kim delimo podatke</h2>
        <ul>
          <li><strong>Cloudinary</strong> — skladištenje fotografija.</li>
          <li><strong>Prisma Postgres</strong> — metapodaci.</li>
          <li><strong>Vercel</strong> — hosting.</li>
          <li><strong>Google Analytics</strong> — samo uz pristanak.</li>
        </ul>

        <h2>6. Vaša prava (GDPR Art. 15-22)</h2>
        <p>Pristup, ispravka, brisanje, prenosivost, prigovor, pritužba nadzornom organu. Pišite na <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a> — odgovaramo u 30 dana.</p>

        <h2>7. Sigurnost</h2>
        <p>CSRF, rate-limiting, httpOnly cookies, bcrypt, HTTPS.</p>

        <h2>8. Kolačići</h2>
        <p>Vidi <Link href="/cookies">Cookie politiku</Link>.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
