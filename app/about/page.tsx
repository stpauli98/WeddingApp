import Link from "next/link";

export const metadata = {
  title: "O aplikaciji – Svadbeni Album",
  description: "Saznajte kako funkcioniše aplikacija za prikupljanje slika sa svadbe i kako možete tražiti pristup kao mladenci.",
  openGraph: {
    title: "O aplikaciji – Svadbeni Album",
    description: "Saznajte kako funkcioniše aplikacija za prikupljanje slika sa svadbe i kako možete tražiti pristup kao mladenci.",
    url: "https://mojasvadbaa.com/about",
    siteName: "Svadbeni Album",
    images: [
      {
        url: "https://mojasvadbaa.com/slika.png",
        width: 1200,
        height: 630,
        alt: "Svadbeni Album - O aplikaciji",
      },
    ],
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <section className="max-w-xl w-full bg-white/80 rounded-xl shadow-lg p-8 border border-gray-200">
        
        <p className="mb-6 text-lg text-gray-700 text-center">
          Sačuvajte uspomene sa vaše svadbe kroz fotografije i poruke vaših najdražih.
        </p>

        <h1 className="text-3xl font-bold mb-6 text-center text-primary">
          Šta je DodajUspomenu?
        </h1>

        <p className="mb-4 text-lg text-gray-700">
          DodajUspomenu je moderna aplikacija koja omogućava gostima da jednostavno podele svoje fotografije i čestitke sa mladencima, bez potrebe za komplikovanim prijavljivanjem ili deljenjem slika preko društvenih mreža.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-primary">
          Kako funkcioniše?
        </h2>

        <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
          <li>Gost unosi svoje ime, prezime i email adresu.</li>
          <li>Na email dobija verifikacioni kod.</li>
          <li>Nakon potvrde, pristupa svom ličnom panelu gde može uploadovati do 10 slika i ostaviti poruku mladencima.</li>
          <li>Mladenci kasnije pregledaju sve slike i poruke podeljene po gostima.</li>
        </ol>

        <div className="flex justify-center mt-8">
          <Link href="/guest/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            Testirajte aplikaciju kao Gost
          </Link>
          <Link href="/admin/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            Testirajte aplikaciju kao Admin
          </Link>
        </div>

      </section>
    </main>
  );
}

