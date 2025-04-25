import { LoginForm } from "@/components/login-form"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Svadbeni Album – Pošaljite slike mladencima",
  description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
  openGraph: {
    title: "Svadbeni Album – Pošaljite slike mladencima",
    description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
    images: ["/seo-cover.png"],
    type: "website",
    url: "https://mojasvadbaa.com/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Svadbeni Album – Pošaljite slike mladencima",
    description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
    images: ["/seo-cover.png"],
  },
  alternates: {
    canonical: "https://mojasvadbaa.com/",
  },
};

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
