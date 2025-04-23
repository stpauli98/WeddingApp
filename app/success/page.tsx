import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import LogoutButton from "./LogoutButton"

export default async function SuccessPage() {
  // Provera da li je korisnik prijavljen
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get("auth")

  if (!isAuthenticated) {
    redirect("/")
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hvala!</h1>
        <p className="text-muted-foreground mt-4">
          Vaše slike i poruka su uspešno poslate. Mladenci će biti oduševljeni vašim doprinosom!
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <LogoutButton />
      </div>
    </div>
  )
}
