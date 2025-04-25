

import { VerificationForm } from "@/components/verification-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { cookies } from "next/headers";

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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Verifikacija</h1>
        <p className="text-muted-foreground mt-2">Unesite verifikacioni kod koji smo poslali na vašu email adresu</p>
      </div>
      <VerificationForm />
    </div>
  )
}
