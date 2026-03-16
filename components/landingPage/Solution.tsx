"use client"

import Image from "next/image"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion } from "framer-motion"

export default function Solution() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || "sr"

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="solution-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          id="solution-heading"
          className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-lp-text mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("solution.title")}
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl text-lp-muted-foreground mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t("solution.subtitle")}
        </motion.p>

        <motion.div
          className="relative max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Image
            src={`/images/${lang}/gallery-desktop.png`}
            alt={t("solution.imageAlt")}
            width={1200}
            height={617}
            className="w-full h-auto rounded-2xl shadow-xl"
          />
        </motion.div>
      </div>
    </section>
  )
}
