// NO 'use client' - RSC.
import { CheckSquare } from "lucide-react"
import type { TFunction } from "i18next"
import { FadeInOnScroll } from "@/components/motion/FadeInOnScroll"

interface PainPointsProps {
  t: TFunction
}

export default function PainPoints({ t }: PainPointsProps) {
  const points = [
    t("painPoints.point1"),
    t("painPoints.point2"),
    t("painPoints.point3"),
    t("painPoints.point4"),
  ]

  return (
    <section className="py-16 sm:py-20 bg-lp-muted" aria-labelledby="pain-points-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <FadeInOnScroll
          as="h2"
          id="pain-points-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-10"
        >
          {t("painPoints.title")}
        </FadeInOnScroll>

        <div className="space-y-4">
          {points.map((point, index) => (
            <FadeInOnScroll
              key={index}
              delay={index * 0.15}
              className="flex items-center gap-4 text-left bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-sm border border-lp-border"
            >
              <CheckSquare className="w-5 h-5 text-lp-accent flex-shrink-0" aria-hidden="true" />
              <span className="text-lg text-lp-text">{point}</span>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
