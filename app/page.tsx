export const metadata = {
  title: "Svadbeni Album – Pošaljite slike mladencima",
  description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
  openGraph: {
    title: "Svadbeni Album – Pošaljite slike mladencima",
    description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
    images: ["/seo-cover.png"],
    type: "website",
    url: "https://mojasvadbaa.com/admin/register",
  },
  twitter: {
    card: "summary_large_image",
    title: "Svadbeni Album – Pošaljite slike mladencima",
    description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
    images: ["/seo-cover.png"],
  },
  alternates: {
    canonical: "https://mojasvadbaa.com/admin/register",
  },
};

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Link href="/admin/register">
        <Button className="px-8 py-4 text-lg font-semibold rounded shadow bg-blue-600 hover:bg-blue-700 text-white">
          Registruj admin nalog
        </Button>
      </Link>
    </div>
  );
}
