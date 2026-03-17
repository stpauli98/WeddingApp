"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion } from "framer-motion"
import { PRICING_TIERS, PricingTier, TierConfig } from "@/lib/pricing-tiers"
import { Check, ArrowRight, Crown, Camera, Users, Clock } from "lucide-react"

export default function Pricing() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language || "sr") as "sr" | "en"

  const tiers = Object.entries(PRICING_TIERS) as [PricingTier, TierConfig][]

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="pricing-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="pricing-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t("pricing.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map(([tier, config], index) => {
            const isRecommended = config.recommended
            return (
              <motion.div
                key={tier}
                className={`relative rounded-2xl p-6 lg:p-8 flex flex-col ${
                  isRecommended
                    ? "bg-lp-primary text-white shadow-xl ring-2 ring-lp-primary ring-offset-2 scale-[1.03]"
                    : "bg-white border border-lp-border shadow-sm"
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                {/* Most popular badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1 bg-lp-accent text-white text-xs font-bold uppercase tracking-wide rounded-full shadow-md">
                    <Crown className="w-3 h-3" />
                    {t("pricing.mostPopular")}
                  </div>
                )}

                {/* Plan name */}
                <h3 className={`text-xl font-bold mb-1 ${isRecommended ? "text-white" : "text-lp-text"}`}>
                  {config.name[lang]}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  {config.price === 0 ? (
                    <div className={`text-4xl font-bold ${isRecommended ? "text-white" : "text-lp-text"}`}>
                      {t("pricing.free")}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${isRecommended ? "text-white" : "text-lp-text"}`}>
                        {(config.price / 100).toFixed(2)}
                      </span>
                      <span className={`text-base ${isRecommended ? "text-white/80" : "text-lp-muted-foreground"}`}>
                        EUR
                      </span>
                    </div>
                  )}
                  <p className={`text-sm mt-1 ${isRecommended ? "text-white/70" : "text-lp-muted-foreground"}`}>
                    {t("pricing.oneTime")}
                  </p>
                </div>

                {/* Key limits - visual highlight */}
                <div className={`rounded-xl p-4 mb-6 space-y-3 ${
                  isRecommended ? "bg-white/10" : "bg-lp-muted/50"
                }`}>
                  <div className="flex items-center gap-3">
                    <Camera className={`w-4 h-4 flex-shrink-0 ${isRecommended ? "text-white/80" : "text-lp-accent"}`} />
                    <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-lp-text"}`}>
                      {config.imageLimit} {t("pricing.photosPerGuest")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className={`w-4 h-4 flex-shrink-0 ${isRecommended ? "text-white/80" : "text-lp-accent"}`} />
                    <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-lp-text"}`}>
                      {t("pricing.upToGuests", { count: config.guestLimit })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 flex-shrink-0 ${isRecommended ? "text-white/80" : "text-lp-accent"}`} />
                    <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-lp-text"}`}>
                      {config.storageDays <= 30
                        ? t("pricing.storageDays", { count: config.storageDays })
                        : t("pricing.storageYear")}
                    </span>
                  </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {config.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isRecommended ? "text-white/90" : "text-lp-accent"}`} />
                      <span className={`text-sm ${isRecommended ? "text-white/90" : "text-lp-muted-foreground"}`}>
                        {feature[lang]}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Link
                  href={`/${getCurrentLanguageFromPath()}/admin/register?tier=${tier}`}
                  className={`group inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isRecommended
                      ? "bg-white text-lp-primary hover:bg-white/90 shadow-md"
                      : "bg-lp-primary text-white hover:bg-lp-primary/90"
                  }`}
                >
                  {config.price === 0 ? t("pricing.startFree") : t("pricing.choosePlan")}
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Guarantee text */}
        <motion.p
          className="text-center text-sm text-lp-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {t("pricing.guarantee")}
        </motion.p>
      </div>
    </section>
  )
}
