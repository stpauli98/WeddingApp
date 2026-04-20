import Link from 'next/link';

export const metadata = {
  title: 'Kontakt | DodajUspomenu',
  description: 'Kontakt i Impressum.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/kontakt' },
};

export default function KontaktPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Kontakt</h1>
        <p>Pitanja, podrška, GDPR zahtevi: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a></p>
        <p>Odgovaramo u 1-2 radna dana.</p>

        <h2>Impressum</h2>
        <p>
          <strong>Naziv:</strong> DodajUspomenu<br />
          <strong>Operater:</strong> [POPUNITI: pravno lice ili preduzetnik]<br />
          <strong>Adresa:</strong> [POPUNITI: ulica, broj, grad, poštanski broj, država]<br />
          <strong>Matični broj / PIB:</strong> [POPUNITI]<br />
          <strong>Email:</strong> kontakt@dodajuspomenu.com
        </p>
        <p className="text-sm text-gray-500">U skladu sa članom 5 Direktive 2000/31/EC.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
