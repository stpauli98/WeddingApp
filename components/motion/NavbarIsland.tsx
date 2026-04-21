"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

interface NavLink {
  label: string
  href: string
}

interface NavbarIslandProps {
  mainNavLabel: string
  menuOpenLabel: string
  menuCloseLabel: string
  navLinks: NavLink[]
  desktopTail: ReactNode
  mobileTail: ReactNode
  brandHref: string
  brandLabel: string
}

export function NavbarIsland({
  mainNavLabel,
  menuOpenLabel,
  menuCloseLabel,
  navLinks,
  desktopTail,
  mobileTail,
  brandHref,
  brandLabel,
}: NavbarIslandProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!navContainerRef.current?.contains(e.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [isMobileMenuOpen])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-transparent"
      }`}
      role="navigation"
      aria-label={mainNavLabel}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={navContainerRef}>
        <div className="flex items-center justify-between h-16">
          <Link
            href={brandHref}
            className="font-playfair text-xl font-bold text-lp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
          >
            {brandLabel}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-lp-text hover:text-lp-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
              >
                {link.label}
              </a>
            ))}
            {desktopTail}
          </div>

          <button
            className="md:hidden p-2 text-lp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? menuCloseLabel : menuOpenLabel}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden bg-white border-t border-lp-border shadow-lg"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={reduce ? undefined : { opacity: 1, height: "auto" }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-4 space-y-3" onClick={() => setIsMobileMenuOpen(false)}>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block py-2 text-lp-text hover:text-lp-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
                  >
                    {link.label}
                  </a>
                ))}
                {mobileTail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
