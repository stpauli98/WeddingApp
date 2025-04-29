import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6 text-red-600">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Stranica nije pronađena</h2>
        <p className="mb-8 text-muted-foreground">
          Izgleda da stranica koju tražite ne postoji ili je uklonjena.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded hover:bg-primary/90 transition"
        >
          Povratak na početnu
        </Link>
      </div>
    </main>
  );
}
