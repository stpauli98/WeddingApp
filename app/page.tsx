export const metadata = {
  title: "DodajUspomenu – Digitalni svadbeni album i razmena slika",
  description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmena fotografija sa venčanja.",
  keywords: [
    "svadbeni album",
    "slike sa venčanja",
    "upload slika",
    "mladenci",
    "gosti",
    "digitalni album",
    "čestitke",
    "uspomene",
    "wedding photo album",
    "wedding guests",
    "wedding app"
  ],
  authors: [{ name: "DodajUspomenu Team", url: "https://mojasvadbaa.com" }],
  openGraph: {
    title: "DodajUspomenu – Digitalni svadbeni album i razmena slika",
    description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
    images: ["/seo-cover.png"],
    type: "website",
    url: "https://mojasvadbaa.com/",
    siteName: "DodajUspomenu"
  },
  twitter: {
    card: "summary_large_image",
    title: "DodajUspomenu – Digitalni svadbeni album i razmena slika",
    description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
    images: ["/seo-cover.png"],
    site: "@dodajuspomenu"
  },
  alternates: {
    canonical: "https://mojasvadbaa.com/",
  }
};



import { Inter } from "next/font/google";
import ClientPage from "@/components/ClientPage";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
      <ClientPage />
    </main>
  );
}
