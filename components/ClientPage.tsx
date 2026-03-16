'use client'

import Navbar from "@/components/landingPage/Navbar"
import HeroSection from "@/components/landingPage/HeroSection"
import PainPoints from "@/components/landingPage/PainPoints"
import Solution from "@/components/landingPage/Solution"
import HowItWorks from "@/components/landingPage/HowItWorks"
import SocialProof from "@/components/landingPage/SocialProof"
import Benefits from "@/components/landingPage/Benefits"
import FAQ from "@/components/landingPage/FAQ"
import Footer from "@/components/landingPage/Footer"
import I18nProvider from "@/components/I18nProvider"

export default function ClientPage() {
  return (
    <I18nProvider>
      <Navbar />
      <HeroSection />
      <PainPoints />
      <Solution />
      <HowItWorks />
      <SocialProof />
      <Benefits />
      <FAQ />
      <Footer />
    </I18nProvider>
  )
}
