// NO 'use client' - RSC.
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Shield, Clock, CheckCircle, Sparkles } from "lucide-react"
import type { TFunction } from "i18next"
import { FadeInUpOnMount } from "@/components/motion/FadeInUpOnMount"

interface HeroSectionProps {
  t: TFunction
  lang: "sr" | "en"
}

export default function HeroSection({ t, lang }: HeroSectionProps) {
  const trustIndicators = [
    { icon: Shield, text: t("hero.trustPrivacy") },
    { icon: Clock, text: t("hero.trustSpeed") },
    { icon: CheckCircle, text: t("hero.trustFree") },
  ]

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center bg-lp-bg pt-20 md:pt-16" aria-labelledby="hero-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Text */}
          <FadeInUpOnMount className="space-y-5 md:space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lp-accent/10 border border-lp-accent/20">
              <Sparkles className="w-4 h-4 text-lp-accent" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-semibold text-lp-accent">{t("hero.eyebrow")}</span>
            </div>

            <h1 id="hero-heading" className="font-playfair text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight text-lp-text">
              {t("hero.titleLine1")}{" "}
              <span className="text-[hsl(340,25%,55%)]">{t("hero.titleLine2")}</span>{" "}
              {t("hero.titleLine3")}
            </h1>

            <p className="text-base sm:text-lg text-lp-muted-foreground max-w-lg mx-auto md:mx-0 leading-relaxed">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-start justify-center">
              <Link
                href={`/${lang}/admin/register`}
                className="group inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white bg-lp-primary rounded-xl shadow-lg hover:shadow-xl hover:bg-lp-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <a
                href="#kako-radi"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-lp-text bg-white border border-lp-border rounded-xl shadow-sm hover:shadow-md hover:bg-lp-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-5 pt-2 justify-center md:justify-start">
              {trustIndicators.map((indicator, index) => {
                const Icon = indicator.icon
                return (
                  <div key={index} className="flex items-center gap-1.5 text-lp-muted-foreground">
                    <Icon className="w-4 h-4 text-lp-accent" aria-hidden="true" />
                    <span className="text-xs sm:text-sm font-medium">{indicator.text}</span>
                  </div>
                )
              })}
            </div>
          </FadeInUpOnMount>

          {/* Right: Phone mockup - visible on all sizes */}
          <FadeInUpOnMount delay={0.2} className="flex justify-center mt-4 md:mt-0">
            <div className="relative w-[200px] h-[400px] sm:w-[240px] sm:h-[480px] md:w-[280px] md:h-[560px] lg:w-[300px] lg:h-[600px] bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] p-2 sm:p-3 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-5 sm:h-6 bg-gray-900 rounded-b-xl sm:rounded-b-2xl z-10" />
              <div className="relative w-full h-full rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.25rem] overflow-hidden bg-white">
                <Image
                  src={`/images/${lang}/guest-login-filled.png`}
                  alt={t("hero.mockupAlt")}
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, (max-width: 1024px) 280px, 300px"
                />
              </div>
            </div>
          </FadeInUpOnMount>
        </div>
      </div>
    </section>
  )
}
