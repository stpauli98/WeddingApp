

import { VerificationForm } from "@/components/guest/VerificationForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { cookies } from "next/headers";

export const metadata = {
  title: "Verifikacija gosta | Svadbeni Album",
  description: "Verifikujte svoj nalog i pošaljite slike mladencima.",
  openGraph: {
    title: "Verifikacija gosta | Svadbeni Album",
    description: "Verifikujte svoj nalog i pošaljite slike mladencima.",
    images: ["/seo-cover.png"],
    type: "website",
    url: "https://mojasvadbaa.com/verify",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verifikacija gosta | Svadbeni Album",
    description: "Verifikujte svoj nalog i pošaljite slike mladencima.",
    images: ["/seo-cover.png"],
  },
  alternates: {
    canonical: "https://mojasvadbaa.com/verify",
  },
};

export default async function VerifyPage() {
  // Proveri da li je korisnik već autentifikovan preko session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";

  // Ako je korisnik već autentifikovan, prikaži poruku i link na dashboard
  if (guestId) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Već ste prijavljeni</h1>
          <p className="text-muted-foreground mt-4">
            Već ste uspješno verificirali svoj račun.
          </p>
        </div>
        <Link href="/dashboard">
          <Button>Idi na dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <VerificationForm />
    </div>
  )
}
