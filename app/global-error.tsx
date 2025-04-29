'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6 text-red-600">Greška</h1>
        <h2 className="text-2xl font-semibold mb-4">Došlo je do neočekivane greške</h2>
        <p className="mb-8 text-muted-foreground">
          Nažalost, nešto nije u redu. Pokušajte ponovo ili se vratite na početnu stranicu.
        </p>
        <button
          onClick={() => reset()}
          className="inline-block px-6 py-3 bg-primary text-white rounded hover:bg-primary/90 transition mb-4"
        >
          Pokušaj ponovo
        </button>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-secondary text-primary rounded hover:bg-secondary/80 transition"
        >
          Povratak na početnu
        </a>
      </div>
    </main>
  );
}
