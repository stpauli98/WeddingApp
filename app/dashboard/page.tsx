import { WeddingInfo } from "@/components/wedding-info"
import { UploadForm } from "@/components/upload-form"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"


export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Provera da li je korisnik prijavljen
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get("auth")
  const params = await searchParams

  // Ako je test mod, postavimo auth cookie
  if (!isAuthenticated) {
    // Ovdje više nije moguće postaviti kolačiće direktno sa servera u App Router-u.
    // Ako želiš postaviti kolačiće, koristi API route ili middleware.
    // Postavljanje test podataka možeš uraditi na drugi način, npr. preko API poziva sa klijenta.
  } else if (!isAuthenticated) {
    redirect("/")
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <WeddingInfo />
      <UploadForm />
    </div>
  )
}
