"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import {
  ArrowRight,
  Shield,
  Clock,
  Users,
  Camera,
  Star,
  CheckCircle,
  Sparkles
} from "lucide-react"

export default function HeroSection() {
  const { t } = useTranslation()
  const [imagesCount, setImagesCount] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [eventsCreated, setEventsCreated] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  // Parallax effects
  const { scrollY } = useScroll()
  const backgroundY = useTransform(scrollY, [0, 800], [0, 200])
  const floatingY = useTransform(scrollY, [0, 800], [0, -100])

  // Animated counters
  useEffect(() => {
    const animateCounter = (setter: (value: number) => void, target: number, delay = 0) => {
      setTimeout(() => {
        const duration = 2500
        const startTime = Date.now()

        const updateCounter = () => {
          const elapsed = Date.now() - startTime
          if (elapsed < duration) {
            const progress = elapsed / duration
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setter(Math.floor(easeOut * target))
            requestAnimationFrame(updateCounter)
          } else {
            setter(target)
          }
        }
        requestAnimationFrame(updateCounter)
      }, delay)
    }

    animateCounter(setImagesCount, 1250, 500)
    animateCounter(setActiveUsers, 89, 800)
    animateCounter(setEventsCreated, 156, 1100)
  }, [])

  const statsCards = [
    {
      icon: Camera,
      value: imagesCount,
      suffix: "+",
      label: t('hero.statsImages') || 'Fotografija prikupljeno',
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: Users,
      value: activeUsers,
      suffix: "+",
      label: t('hero.statsUsers') || 'Parova koristi',
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Star,
      value: eventsCreated,
      suffix: "+",
      label: t('hero.statsEvents') || 'Događaja kreirano',
      color: "from-orange-500 to-red-600"
    }
  ]

  const trustIndicators = [
    {
      icon: Shield,
      text: t('hero.trustPrivacy') || 'Privatno i sigurno'
    },
    {
      icon: Clock,
      text: t('hero.trustSetup') || 'Setup za 2 min'
    },
    {
      icon: CheckCircle,
      text: t('hero.trustFree') || '100% Besplatno'
    }
  ]

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen lg:min-h-screen overflow-hidden bg-gradient-to-br from-lp-background via-white to-lp-muted/30"
      aria-labelledby="hero-heading"
      role="region"
    >
      {/* Language selector */}
      <motion.div
        className="absolute top-6 right-6 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <LanguageSelector className="backdrop-blur-md bg-white/80 shadow-lg border border-white/20" />
      </motion.div>

      {/* Floating gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 rounded-full bg-gradient-to-r from-lp-primary/20 to-lp-accent/20 blur-3xl"
          style={{ y: floatingY }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-gradient-to-r from-lp-accent/20 to-lp-primary/20 blur-3xl"
          style={{ y: backgroundY }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Main content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-32">

        {/* Hero content */}
        <div className="max-w-6xl mx-auto text-center space-y-12">

          {/* Eyebrow text */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-lp-primary/10 to-lp-accent/10 border border-lp-primary/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="w-4 h-4 text-lp-primary" />
            <span className="text-sm font-semibold text-lp-primary uppercase tracking-wide">
              {t('hero.eyebrow') || 'Najbrži način za prikupljanje fotografija'}
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1
              id="hero-heading"
              className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight"
            >
              <span className="block text-lp-primary mb-2">
                {t('hero.titleLine1') || 'Sačuvajte sve'}
              </span>
              <span className="block bg-gradient-to-r from-lp-primary via-lp-accent to-lp-primary bg-clip-text text-transparent animate-gradient">
                {t('hero.titleLine2') || 'uspomene'}
              </span>
              <span className="block text-lp-primary">
                {t('hero.titleLine3') || 'sa vjenčanja'}
              </span>
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-lp-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('hero.description') || 'Jednostavan način da prikupite sve fotografije koje su vaši gosti napravili tokom vjenčanja na jednom mjestu, bez komplikacija.'}
            </p>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap justify-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {trustIndicators.map((indicator, index) => {
              const Icon = indicator.icon
              return (
                <div key={index} className="flex items-center gap-2 text-lp-muted-foreground">
                  <Icon className="w-4 h-4 text-lp-primary" />
                  <span className="text-sm font-medium">{indicator.text}</span>
                </div>
              )
            })}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href={`/${getCurrentLanguageFromPath()}/admin/register`}
                className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-lp-primary to-lp-accent rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:from-lp-accent hover:to-lp-primary"
              >
                {t('hero.createEvent') || 'Kreirajte besplatan događaj'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold text-lp-primary bg-white/80 backdrop-blur-sm border border-lp-primary/20 rounded-xl shadow-lg hover:shadow-xl hover:bg-white transition-all duration-200"
              >
                {t('hero.howItWorks') || 'Kako funkcioniše'}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Bento Grid Stats */}
        <motion.div
          className="max-w-5xl mx-auto mt-16 lg:mt-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  className="relative group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="relative overflow-hidden rounded-xl lg:rounded-2xl bg-white/60 backdrop-blur-md border border-white/20 p-4 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                        </div>
                        <div className="text-right">
                          <motion.div
                            className="text-2xl lg:text-3xl xl:text-4xl font-bold text-lp-primary"
                            key={stat.value}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {stat.value.toLocaleString()}{stat.suffix}
                          </motion.div>
                        </div>
                      </div>
                      <p className="text-xs lg:text-sm font-medium text-lp-muted-foreground">
                        {stat.label}
                      </p>
                    </div>

                    {/* Shine effect - only on desktop */}
                    <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12 lg:mt-16 mb-8">
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
          >
            <span className="text-sm text-lp-muted-foreground font-medium">
              {t('hero.scrollDown') || 'Skrolujte da vidite više'}
            </span>
            <motion.div
              className="w-6 h-10 border-2 border-lp-primary/30 rounded-full flex justify-center overflow-hidden"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-1 h-3 bg-lp-primary rounded-full mt-2"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}