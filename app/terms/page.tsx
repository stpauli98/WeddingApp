import Link from 'next/link';

export const metadata = {
  title: 'Uslovi korišćenja | DodajUspomenu',
  description: 'Uslovi korišćenja platforme DodajUspomenu.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/terms' },
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Uslovi korišćenja</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>1. Prihvatanje</h2>
        <p>Korišćenjem DodajUspomenu prihvatate ove uslove.</p>

        <h2>2. Opis usluge</h2>
        <p>Platforma za prikupljanje svadbenih fotografija putem QR koda.</p>

        <h2>3. Paketi i cena</h2>
        <ul>
          <li><strong>Besplatan:</strong> 3 slike po gostu × 20 gostiju, 30 dana.</li>
          <li><strong>Osnovni (€25):</strong> 7 slika po gostu × 100 gostiju, 30 dana.</li>
          <li><strong>Premium (€75):</strong> 25 slika po gostu × 300 gostiju, 30 dana, original.</li>
        </ul>
        <p>Refund moguć 14 dana ako nijedna slika nije otpremljena (Directive 2011/83/EU).</p>

        <h2>4. Obaveze korisnika</h2>
        <ul>
          <li>Nije dozvoljen sadržaj koji krši autorska prava ili je nezakonit.</li>
          <li>Mladenci obaveštavaju goste da se slike prikupljaju.</li>
          <li>Zabranjen automatizovan upload.</li>
        </ul>

        <h2>5. Intelektualna svojina</h2>
        <p>Korisnici zadržavaju autorska prava. Dajete ograničenu licencu za hosting/isporuku tokom retention-a.</p>

        <h2>6. Ograničenje odgovornosti</h2>
        <p>Usluga &quot;kako jeste&quot;. Maksimalna odgovornost ograničena na cenu paketa.</p>

        <h2>7. Prekid</h2>
        <p>Nalog brišete iz admin panela ili emailom na <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>

        <h2>8. Nadležno pravo</h2>
        <p>Srpsko pravo i sudovi u Beogradu, osim potrošačkih izuzetaka.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
