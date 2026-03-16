"use client"

import Image from "next/image"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { UserPlus, QrCode, Download } from "lucide-react"

export default function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    { icon: UserPlus, title: t("howItWorks.step1Title"), description: t("howItWorks.step1Description"), num: "1" },
    { icon: QrCode, title: t("howItWorks.step2Title"), description: t("howItWorks.step2Description"), num: "2" },
    { icon: Download, title: t("howItWorks.step3Title"), description: t("howItWorks.step3Description"), num: "3" },
  ]

  return (
    <section id="kako-radi" className="py-16 sm:py-20 bg-lp-muted" aria-labelledby="how-it-works-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="how-it-works-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.description")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
              >
                <div className="w-14 h-14 rounded-full bg-lp-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md">
                  {step.num}
                </div>
                <div className="w-12 h-12 rounded-lg bg-lp-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-lp-accent" />
                </div>
                <h3 className="text-xl font-bold text-lp-text mb-2">{step.title}</h3>
                <p className="text-lp-muted-foreground">{step.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Visual: App screenshot showing the process */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Image
            src="/dodajuspomenu-how-it-works.png"
            alt="Kako DodajUspomenu funkcioniše"
            width={1200}
            height={617}
            className="w-full h-auto rounded-2xl shadow-lg"
          />
        </motion.div>
      </div>
    </section>
  )
}
