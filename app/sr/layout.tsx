import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DodajUspomenu – Digitalni svadbeni album i razmjena slika",
  description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmjena fotografija sa vjenčanja.",
  alternates: {
    canonical: "https://www.dodajuspomenu.com/sr",
    languages: {
      "sr-RS": "https://www.dodajuspomenu.com/sr",
      "en-US": "https://www.dodajuspomenu.com/en",
      "x-default": "https://www.dodajuspomenu.com/sr",
    },
  },
  openGraph: {
    locale: "sr_RS",
    alternateLocale: ["en_US"],
  },
};

export default function SrLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
