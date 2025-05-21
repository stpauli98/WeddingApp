'use client';

import { useTranslation } from 'react-i18next';
import HeroSection from "@/components/landingPage/HeroSection";
import HowItWorks from "@/components/landingPage/HowItWorks";
import Benefits from "@/components/landingPage/Benefits";
import FAQ from "@/components/landingPage/FAQ";
import Testimonials from "@/components/landingPage/Testimonials";
import Footer from "@/components/landingPage/Footer";
import I18nProvider from "@/components/I18nProvider";

export default function ClientPage() {
  // Inicijalizacija i18n na klijentskoj strani
  const { t } = useTranslation();
  
  return (
    <I18nProvider>
      <HeroSection />
      <HowItWorks id="how-it-works" />
      <Benefits />
      <Testimonials />
      <FAQ />
      <Footer />
    </I18nProvider>
  );
}
