"use client"

import Image from "next/image"
import { useTranslation } from "react-i18next"
import { motion, useReducedMotion } from "framer-motion"
import { Heart, Users, Globe } from "lucide-react"
import { useEffect, useState, useRef } from "react"

function useCounterAnimation(target: number, duration = 2000, reduce = false) {
  const [count, setCount] = useState(reduce ? target : 0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduce) {
      setCount(target)
      return
    }
    if (hasAnimated || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          const start = Date.now()
          const animate = () => {
            const elapsed = Date.now() - start
            if (elapsed < duration) {
              const progress = elapsed / duration
              const easeOut = 1 - Math.pow(1 - progress, 3)
              setCount(Math.floor(easeOut * target))
              requestAnimationFrame(animate)
            } else {
              setCount(target)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration, hasAnimated, reduce])

  return { count, ref }
}

export default function SocialProof() {
  const { t } = useTranslation()
  const reduce = useReducedMotion() ?? false
  const couples = useCounterAnimation(20, 2000, reduce)
  const guests = useCounterAnimation(100, 2000, reduce)
  const countries = useCounterAnimation(4, 2000, reduce)

  const stats = [
    { icon: Heart, value: couples.count, ref: couples.ref, suffix: "+", label: t("socialProof.statCouples") },
    { icon: Users, value: guests.count, ref: guests.ref, suffix: "+", label: t("socialProof.statGuests") },
    { icon: Globe, value: countries.count, ref: countries.ref, suffix: "", label: t("socialProof.statCountries"), sublabel: t("socialProof.countriesList") },
  ]

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="social-proof-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.h2
          id="social-proof-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-text text-center mb-12"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("socialProof.title")}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={index}
                ref={stat.ref}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-lp-border"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Icon className="w-8 h-8 text-lp-accent mx-auto mb-3" aria-hidden="true" />
                <div className="text-3xl md:text-4xl font-bold text-lp-text mb-1">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm text-lp-muted-foreground">{stat.label}</div>
                {stat.sublabel && (
                  <div className="text-xs text-lp-muted-foreground mt-1">{stat.sublabel}</div>
                )}
              </motion.div>
            )
          })}
        </div>

        <motion.div
          className="flex justify-center mt-8"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("a11y.productHunt")}
          >
            <Image
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818"
              alt="AddMemories on Product Hunt"
              width={200}
              height={43}
              style={{ width: "200px", height: "43px" }}
              unoptimized
            />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
