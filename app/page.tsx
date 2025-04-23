import { LoginForm } from "@/components/login-form"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Dobrodošli</h1>
        <Link href="/login">
          <Button className="text-lg px-8 py-4">Prijava</Button>
        </Link>
      </div>
    </main>
  )
}
