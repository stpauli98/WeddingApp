import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AddMemories – Digital Wedding Album",
  description: "Collect wedding photos from all guests via QR code. Guests upload, newlyweds download.",
  alternates: {
    canonical: "https://www.dodajuspomenu.com/en",
    languages: {
      "sr-RS": "https://www.dodajuspomenu.com/sr",
      "en-US": "https://www.dodajuspomenu.com/en",
      "x-default": "https://www.dodajuspomenu.com/sr",
    },
  },
  openGraph: {
    locale: "en_US",
    alternateLocale: ["sr_RS"],
    title: "AddMemories – Digital Wedding Album",
    description: "Collect wedding photos from all guests via QR code.",
  },
};

export default function EnLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
