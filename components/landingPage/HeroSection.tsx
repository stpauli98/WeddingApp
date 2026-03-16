"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion } from "framer-motion"
import { ArrowRight, Shield, Clock, CheckCircle, Sparkles } from "lucide-react"

export default function HeroSection() {
  const { t } = useTranslation()

  const trustIndicators = [
    { icon: Shield, text: t("hero.trustPrivacy") },
    { icon: Clock, text: t("hero.trustSpeed") },
    { icon: CheckCircle, text: t("hero.trustFree") },
  ]

  return (
    <section className="relative min-h-screen flex items-center bg-lp-bg pt-16" aria-labelledby="hero-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lp-accent/10 border border-lp-accent/20">
              <Sparkles className="w-4 h-4 text-lp-accent" />
              <span className="text-sm font-semibold text-lp-accent">{t("hero.eyebrow")}</span>
            </div>

            <h1 id="hero-heading" className="font-playfair text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-lp-text">
              {t("hero.titleLine1")}{" "}
              <span className="text-[hsl(340,25%,55%)]">{t("hero.titleLine2")}</span>{" "}
              {t("hero.titleLine3")}
            </h1>

            <p className="text-lg text-lp-muted-foreground max-w-lg leading-relaxed">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${getCurrentLanguageFromPath()}/admin/register`}
                className="group inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white bg-lp-primary rounded-xl shadow-lg hover:shadow-xl hover:bg-lp-primary/90 transition-all"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#kako-radi"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-lp-text bg-white border border-lp-border rounded-xl shadow-sm hover:shadow-md hover:bg-lp-muted transition-all"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>

            <div className="flex flex-wrap gap-5 pt-2">
              {trustIndicators.map((indicator, index) => {
                const Icon = indicator.icon
                return (
                  <div key={index} className="flex items-center gap-2 text-lp-muted-foreground">
                    <Icon className="w-4 h-4 text-lp-accent" />
                    <span className="text-sm font-medium">{indicator.text}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Right: Phone mockup with register screenshot */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Desktop: show phone mockup */}
            <div className="hidden md:block relative w-[300px] h-[600px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />
              <div className="relative w-full h-full rounded-[2.25rem] overflow-hidden bg-white">
                <Image
                  src="/images/dodajuspomenu-guest-login-filled.png"
                  alt={t("hero.titleLine1")}
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="300px"
                />
              </div>
            </div>
            {/* Mobile: show mobile hero image */}
            <div className="block md:hidden w-full max-w-sm">
              <Image
                src="/images/dodajuspomenu-gallery-mobile.png"
                alt={t("hero.titleLine1")}
                width={390}
                height={844}
                className="w-full h-auto rounded-2xl shadow-xl"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
