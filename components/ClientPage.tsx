// components/ClientPage.tsx
// NO 'use client'. This is now a server component orchestrator.
// Interactive sections (Navbar, SocialProof, FAQ) remain client components
// and continue to use useTranslation() through the I18nProvider wired in
// app/layout.tsx. ISLAND sections (Hero, PainPoints, Solution, HowItWorks,
// Benefits, Pricing, Footer) are RSC and receive pre-resolved t + lang.
import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';

import Navbar from '@/components/landingPage/Navbar';
import HeroSection from '@/components/landingPage/HeroSection';
import PainPoints from '@/components/landingPage/PainPoints';
import Solution from '@/components/landingPage/Solution';
import HowItWorks from '@/components/landingPage/HowItWorks';
import SocialProof from '@/components/landingPage/SocialProof';
import Benefits from '@/components/landingPage/Benefits';
import Pricing from '@/components/landingPage/Pricing';
import FAQ from '@/components/landingPage/FAQ';
import Footer from '@/components/landingPage/Footer';

interface ClientPageProps {
  t: TFunction;
  lang: 'sr' | 'en';
  tiers: PricingPlanRow[];
}

export default function ClientPage({ t, lang, tiers }: ClientPageProps) {
  return (
    <>
      <Navbar />
      <HeroSection t={t} lang={lang} />
      <PainPoints t={t} />
      <Solution t={t} lang={lang} />
      <HowItWorks t={t} lang={lang} />
      <SocialProof />
      <Benefits t={t} lang={lang} />
      <Pricing t={t} lang={lang} tiers={tiers} />
      <FAQ />
      <Footer t={t} lang={lang} />
    </>
  );
}
