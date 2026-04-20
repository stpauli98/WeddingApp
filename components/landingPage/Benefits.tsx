"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { motion, useReducedMotion } from "framer-motion"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { Lock, Zap, Cloud, ArrowRight } from "lucide-react"

export default function Benefits() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  const benefits = [
    { icon: Lock, title: t("whyUs.benefit1Title"), description: t("whyUs.benefit1Description") },
    { icon: Zap, title: t("whyUs.benefit2Title"), description: t("whyUs.benefit2Description") },
    { icon: Cloud, title: t("whyUs.benefit3Title"), description: t("whyUs.benefit3Description") },
  ]

  return (
    <section className="py-16 sm:py-20 bg-lp-muted" aria-labelledby="why-us-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h2
          id="why-us-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-text text-center mb-12"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("whyUs.title")}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm border border-lp-border text-center hover:shadow-lg transition-shadow"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={reduce ? undefined : { y: -4 }}
              >
                <div className="w-14 h-14 rounded-xl bg-lp-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-lp-accent" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-lp-text mb-2">{benefit.title}</h3>
                <p className="text-sm text-lp-muted-foreground">{benefit.description}</p>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          className="text-center bg-lp-muted rounded-2xl p-8 sm:p-12"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="font-playfair text-2xl md:text-3xl font-bold text-lp-text mb-4">
            {t("whyUs.ctaTitle")}
          </h3>
          <Link
            href={`/${getCurrentLanguageFromPath()}/admin/register`}
            className="group inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-lp-primary rounded-xl shadow-lg hover:shadow-xl hover:bg-lp-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
          >
            {t("whyUs.ctaButton")}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
          <p className="text-sm text-lp-muted-foreground mt-3">
            {t("whyUs.ctaSubtext")}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
