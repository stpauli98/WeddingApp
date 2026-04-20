"use client"

import { useTranslation } from "react-i18next"
import { motion, useReducedMotion } from "framer-motion"
import { CheckSquare } from "lucide-react"

export default function PainPoints() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  const points = [
    t("painPoints.point1"),
    t("painPoints.point2"),
    t("painPoints.point3"),
    t("painPoints.point4"),
  ]

  return (
    <section className="py-16 sm:py-20 bg-lp-muted" aria-labelledby="pain-points-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          id="pain-points-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-10"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("painPoints.title")}
        </motion.h2>

        <div className="space-y-4">
          {points.map((point, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-4 text-left bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-sm border border-lp-border"
              initial={reduce ? false : { opacity: 0, x: -20 }}
              whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
            >
              <CheckSquare className="w-5 h-5 text-lp-accent flex-shrink-0" aria-hidden="true" />
              <span className="text-lg text-lp-text">{point}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
