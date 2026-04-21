import Link from 'next/link';
import { LegalLocaleNotice } from '@/components/LegalLocaleNotice';

export const metadata = {
  title: 'Kontakt | DodajUspomenu',
  description: 'Kontakt i Impressum.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/kontakt' },
};

export default function KontaktPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <LegalLocaleNotice />
        <h1>Kontakt</h1>
        <p>Pitanja, podrška, GDPR zahtevi: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a></p>
        <p>Odgovaramo u 1-2 radna dana.</p>

        <h2>Impressum</h2>
        <p>
          <strong>Naziv usluge:</strong> DodajUspomenu<br />
          <strong>Operater:</strong> Next Pixel s.p.<br />
          <strong>Adresa:</strong> Jovana Dučića 15, 78400 Gradiška, Bosna i Hercegovina<br />
          <strong>JIB:</strong> 4513996760008<br />
          <strong>Email:</strong> kontakt@dodajuspomenu.com
        </p>
        <p className="text-sm text-gray-500">U skladu sa članom 5 Direktive 2000/31/EC i Zakonom o elektronskom poslovanju BiH.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
