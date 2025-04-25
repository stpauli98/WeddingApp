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

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/about");
  return null;
}
