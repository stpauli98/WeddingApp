export const metadata = {
  title: "DodajUspomenu – Digitalni svadbeni album i razmena slika",
  description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmena fotografija sa venčanja.",
  authors: [{ name: "DodajUspomenu Team", url: "https://www.dodajuspomenu.com" }],
  openGraph: {
    title: "DodajUspomenu – Digitalni svadbeni album i razmena slika",
    description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
    images: ["/seo-cover.png"],
    type: "website",
    url: "https://www.dodajuspomenu.com/",
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
    canonical: "https://www.dodajuspomenu.com/",
  }
};

import { preload } from "react-dom";
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function Home() {
  // LCP candidate: hero video's poster image. The <video> uses preload="none"
  // so we promote the poster here instead. Scoped per-page so admin/guest
  // routes don't pay for a resource they never render.
  preload("/videos/hero-guest-flow-poster.jpg", {
    as: "image",
    fetchPriority: "high",
  });

  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
