// NO 'use client' - RSC.
import Image from "next/image"
import type { TFunction } from "i18next"
import { UserPlus, QrCode, Download } from "lucide-react"
import { FadeInOnScroll } from "@/components/motion/FadeInOnScroll"

interface HowItWorksProps {
  t: TFunction
  lang: "sr" | "en"
}

export default function HowItWorks({ t, lang }: HowItWorksProps) {
  const steps = [
    { icon: UserPlus, title: t("howItWorks.step1Title"), description: t("howItWorks.step1Description"), num: "1" },
    { icon: QrCode, title: t("howItWorks.step2Title"), description: t("howItWorks.step2Description"), num: "2" },
    { icon: Download, title: t("howItWorks.step3Title"), description: t("howItWorks.step3Description"), num: "3" },
  ]

  return (
    <section id="kako-radi" className="py-16 sm:py-20 bg-lp-muted" aria-labelledby="how-it-works-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-14">
          <h2 id="how-it-works-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.description")}
          </p>
        </FadeInOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <FadeInOnScroll
                key={step.num}
                delay={index * 0.15}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-lp-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md">
                  {step.num}
                </div>
                <div className="w-12 h-12 rounded-lg bg-lp-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-lp-accent" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-lp-text mb-2">{step.title}</h3>
                <p className="text-lp-muted-foreground">{step.description}</p>
              </FadeInOnScroll>
            )
          })}
        </div>

        <FadeInOnScroll delay={0.3} className="max-w-4xl mx-auto">
          <Image
            src={`/images/${lang}/dashboard-desktop.png`}
            alt={t("howItWorks.imageAlt")}
            width={1200}
            height={617}
            className="w-full h-auto rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg max-h-[300px] sm:max-h-none object-cover object-top"
          />
        </FadeInOnScroll>
      </div>
    </section>
  )
}
