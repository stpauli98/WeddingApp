"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

export default function FAQ() {
  const { t } = useTranslation()

  const faqItems = Array.from({ length: 8 }, (_, i) => ({
    question: t(`faq.question${i + 1}`),
    answer: t(`faq.answer${i + 1}`),
  }))

  return (
    <section id="faq" className="py-16 sm:py-20 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="faq-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t("faq.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground">{t("faq.subtitle")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full bg-white border border-lp-border rounded-xl shadow-sm p-2 md:p-4">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-lp-text hover:text-lp-accent transition-colors">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-lp-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
