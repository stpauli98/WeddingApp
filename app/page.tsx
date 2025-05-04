export const metadata = {
  title: "DodajUspomenu",
  description: "Aplikacija za goste – uploadujte slike i čestitke mladencima.",
  openGraph: {
    title: "DodajUspomenu",
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
  }
};

import { Inter } from "next/font/google";
import HeroSection from "@/components/landingPage/HeroSection";
import HowItWorks from "@/components/landingPage/HowItWorks";
import Benefits from "@/components/landingPage/Benefits";
import FAQ from "@/components/landingPage/FAQ";
import Testimonials from "@/components/landingPage/Testimonials";
import Footer from "@/components/landingPage/Footer";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
      <HeroSection />
      <HowItWorks id="how-it-works" />
      <Benefits />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
