import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DodajUspomenu – Digitalni svadbeni album i razmjena slika",
  description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmjena fotografija sa vjenčanja.",
};

interface SrLayoutProps {
  children: ReactNode;
}

export default function SrLayout({ children }: SrLayoutProps) {
  return children;
}
