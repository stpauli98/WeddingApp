import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RootWelcome() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Dobrodošli</h1>
        <p className="mb-8 text-lg text-muted-foreground">Aplikacija za goste na svadbi. Prijavite se za nastavak.</p>
        <Link href="/login">
          <Button className="text-lg px-8 py-4">Uloguj se</Button>
        </Link>
      </div>
    </main>
  );
}
