// NO 'use client' - RSC.
import Image from "next/image"
import type { TFunction } from "i18next"
import { FadeInOnScroll } from "@/components/motion/FadeInOnScroll"

interface SolutionProps {
  t: TFunction
  lang: "sr" | "en"
}

export default function Solution({ t, lang }: SolutionProps) {
  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="solution-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <FadeInOnScroll
          as="h2"
          id="solution-heading"
          className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-lp-text mb-4"
        >
          {t("solution.title")}
        </FadeInOnScroll>

        <FadeInOnScroll
          delay={0.1}
          className="text-lg md:text-xl text-lp-muted-foreground mb-10"
        >
          {t("solution.subtitle")}
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.2} className="relative max-w-4xl mx-auto">
          <Image
            src={`/images/${lang}/gallery-desktop.png`}
            alt={t("solution.imageAlt")}
            width={1200}
            height={617}
            className="w-full h-auto rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl"
          />
        </FadeInOnScroll>
      </div>
    </section>
  )
}
