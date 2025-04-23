

import { VerificationForm } from "@/components/verification-form"
import { cookies } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function VerifyPage() {
  // Provera da li korisnik ima userData cookie
  const cookieStore = await cookies();
  const userDataCookie = cookieStore.get("userData");

  // Ako nema userData cookie, prikaži poruku o grešci
  if (!userDataCookie) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sesija je istekla</h1>
          <p className="text-muted-foreground mt-4">
            Vaša sesija je istekla ili niste prošli kroz proces prijave. Molimo vas da se ponovo prijavite.
          </p>
        </div>
        <Link href="/">
          <Button>Povratak na prijavu</Button>
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
