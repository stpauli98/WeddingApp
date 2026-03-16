"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import LanguageSelector from "@/components/LanguageSelector"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function Navbar() {
  const { t } = useTranslation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { label: t("navbar.howItWorks"), href: "#kako-radi" },
    { label: t("navbar.faq"), href: "#faq" },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Glavna navigacija"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-playfair text-xl font-bold text-lp-text">
            DodajUspomenu
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-lp-text hover:text-lp-primary transition-colors">
                {link.label}
              </a>
            ))}
            <LanguageSelector className="text-sm" />
            <Link
              href={`/${getCurrentLanguageFromPath()}/admin/register`}
              className="px-5 py-2 text-sm font-semibold text-white bg-lp-primary rounded-lg hover:bg-lp-primary/90 transition-colors"
            >
              {t("navbar.cta")}
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-lp-text"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t("navbar.menuClose") : t("navbar.menuOpen")}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden bg-white border-t border-lp-border shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="block py-2 text-lp-text hover:text-lp-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              <LanguageSelector className="text-sm w-full" />
              <Link
                href={`/${getCurrentLanguageFromPath()}/admin/register`}
                className="block w-full text-center px-5 py-3 text-sm font-semibold text-white bg-lp-primary rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.cta")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
