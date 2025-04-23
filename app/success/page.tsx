import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

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
        <Link href="/dashboard">
          <Button className="w-full">Povratak na početnu</Button>
        </Link>

        <Link href="/dashboard">
          <Button variant="outline" className="w-full">
            Pošalji još slika
          </Button>
        </Link>
      </div>
    </div>
  )
}
