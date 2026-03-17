# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the WeddingApp landing page with PAS conversion flow, enhanced dusty rose palette, Playfair Display typography, and 9 optimized sections.

**Architecture:** Complete rewrite of landing page components using existing Next.js 15 App Router + Tailwind + Framer Motion stack. New components (Navbar, PainPoints, Solution, SocialProof), rewritten components (Hero, HowItWorks, Benefits, FAQ, Footer), removed components (FooterCommentForm, ImageSlider, Testimonials). All text from i18n translation files.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Radix UI Accordion, i18next, Lucide React icons, next/font/google (Playfair Display + Inter)

**Spec:** `docs/superpowers/specs/2026-03-16-landing-page-redesign-design.md`

**NOTE:** File paths contain a Unicode right single quote (U+2019) in the parent directory. The Read/Edit tools may fail — use Bash (sed, cat) for file operations when needed.

---

## Chunk 1: Foundation (Theme, Font, Translations)

### Task 1: Update Theme CSS — Accent Color

**Files:**
- Modify: `styles/themes/wedding-theme.css`

- [ ] **Step 1: Update `--lp-accent` from mauve to champagne gold**

Change `--lp-accent: 325 16% 60%;` to `--lp-accent: 42 60% 70%;`

```css
--lp-accent: 42 60% 70%;
```

Also update `--lp-accent-hover` to match:

```css
--lp-accent-hover: 42 60% 60%;
```

- [ ] **Step 2: Update `--lp-primary-foreground` to white for better button contrast**

Change `--lp-primary-foreground: 320 16% 30%;` to:

```css
--lp-primary-foreground: 0 0% 100%;
```

- [ ] **Step 3: Verify theme loads correctly**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds without CSS errors

- [ ] **Step 4: Commit**

```bash
git add styles/themes/wedding-theme.css
git commit -m "style: update accent to champagne gold, fix primary-foreground contrast"
```

---

### Task 2: Add Playfair Display Font

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Import Playfair Display alongside Inter**

Add to the imports in `app/layout.tsx`:

```typescript
import { Inter, Playfair_Display } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })
const playfair = Playfair_Display({ 
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
})
```

- [ ] **Step 2: Apply font variable to body**

Update the `<body>` tag:

```tsx
<body className={`${inter.className} ${playfair.variable}`}>
```

- [ ] **Step 3: Add Tailwind font family config**

In `tailwind.config.ts`, add to the `theme.extend` section:

```typescript
fontFamily: {
  playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
},
```

- [ ] **Step 4: Verify font loads**

Run: `pnpm dev` and check browser devtools that `--font-playfair` CSS variable exists on `<body>`.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx tailwind.config.ts
git commit -m "feat: add Playfair Display font for landing page headlines"
```

---

### Task 3: Update Translation Files (Serbian)

**Files:**
- Modify: `locales/sr/translation.json`

- [ ] **Step 1: Update hero section keys**

Replace existing `hero` object with:

```json
"hero": {
  "eyebrow": "Najjednostavniji način za prikupljanje fotografija",
  "titleLine1": "Sve uspomene",
  "titleLine2": "sa vjenčanja",
  "titleLine3": "na jednom mjestu",
  "description": "Vaši gosti slikaju, vi uživate. Bez WhatsApp grupa, bez kompresije, bez komplikacija.",
  "primaryCta": "Počnite za 2 minuta",
  "secondaryCta": "Kako funkcioniše",
  "trustPrivacy": "Privatno i sigurno",
  "trustSpeed": "Setup za 2 min",
  "trustFree": "100% Besplatno"
}
```

- [ ] **Step 2: Add new sections (painPoints, solution, socialProof, whyUs)**

Add after `hero`:

```json
"painPoints": {
  "title": "Poznato vam je?",
  "point1": "Fotografije razbacane po telefonima 50+ gostiju",
  "point2": "Gosti obećaju da će poslati slike — nikad ne pošalju",
  "point3": "WhatsApp uništava kvalitet fotografija",
  "point4": "Nema jednog mjesta za sve uspomene"
},
"solution": {
  "title": "DodajUspomenu rješava sve.",
  "subtitle": "Jedan link. Svi gosti. Sve fotografije.",
  "imageAlt": "Prikaz aplikacije DodajUspomenu"
},
"socialProof": {
  "title": "Parovi nam vjeruju",
  "statCouples": "parova koristilo",
  "statGuests": "gostiju registrovano",
  "statCountries": "zemlje",
  "countriesList": "Srbija, Hrvatska, BiH, SAD"
},
"whyUs": {
  "title": "Zašto DodajUspomenu?",
  "benefit1Title": "Privatno",
  "benefit1Description": "Samo vaši gosti imaju pristup vašim fotografijama",
  "benefit2Title": "Brzo",
  "benefit2Description": "Setup za 2 minuta, bez instalacije, bez komplikacija",
  "benefit3Title": "Sigurno",
  "benefit3Description": "Slike se čuvaju u oblaku, dostupne kad god poželite",
  "ctaTitle": "Spremni za najljepši dan?",
  "ctaButton": "Počnite za 2 minuta",
  "ctaSubtext": "Besplatno. Bez kartice. Bez obaveza."
}
```

- [ ] **Step 3: Update howItWorks to 3 steps**

Replace existing `howItWorks`:

```json
"howItWorks": {
  "title": "Kako funkcioniše?",
  "description": "Tri jednostavna koraka do svih vaših uspomena",
  "step1Title": "Kreirajte događaj",
  "step1Description": "Registrujte se i kreirajte svoj event za 2 minute",
  "step2Title": "Podijelite QR kod",
  "step2Description": "Gosti skeniraju kod ili otvore link i šalju fotografije",
  "step3Title": "Uživajte u slikama",
  "step3Description": "Sve slike su na jednom mjestu, spremne za preuzimanje"
}
```

- [ ] **Step 4: Update FAQ to 7 questions**

Replace existing `faq`:

```json
"faq": {
  "title": "Česta pitanja",
  "subtitle": "Sve što trebate znati o DodajUspomenu",
  "question1": "Kako funkcioniše DodajUspomenu?",
  "answer1": "Kreirate event, podijelite link ili QR kod gostima, oni uploaduju slike direktno sa telefona. Vi sve preuzimate na jednom mjestu.",
  "question2": "Da li je zaista 100% besplatno?",
  "answer2": "Da, potpuno besplatno. Bez skrivenih troškova, bez pretplate, bez kartice.",
  "question3": "Koliko fotografija gosti mogu poslati?",
  "answer3": "Svaki gost može poslati do 10 fotografija u punoj rezoluciji.",
  "question4": "Da li su fotografije privatne i sigurne?",
  "answer4": "Da, samo vi i vaši registrovani gosti imaju pristup fotografijama. Svaki event ima jedinstveni privatni link.",
  "question5": "Koliko dugo se čuvaju fotografije?",
  "answer5": "Fotografije se čuvaju trajno u oblaku. Možete ih preuzeti kad god poželite.",
  "question6": "Može li se koristiti i za druge događaje osim vjenčanja?",
  "answer6": "Apsolutno! DodajUspomenu je savršen za krštenja, rođendane, team building i sve događaje gdje želite prikupiti fotografije.",
  "question7": "Trebaju li gosti instalirati aplikaciju?",
  "answer7": "Ne, sve radi direktno u web browseru. Gosti samo otvore link ili skeniraju QR kod — nema instalacije."
}
```

- [ ] **Step 5: Update footer and add navbar translations**

```json
"navbar": {
  "howItWorks": "Kako radi",
  "faq": "FAQ",
  "cta": "Počnite za 2 min",
  "menuOpen": "Otvori meni",
  "menuClose": "Zatvori meni"
},
"footer": {
  "description": "Najjednostavniji način za prikupljanje fotografija sa vjenčanja.",
  "copyright": "Sva prava zadržana.",
  "privacyPolicy": "Privatnost",
  "termsOfService": "Uslovi korišćenja",
  "contact": "Kontakt"
}
```

- [ ] **Step 6: Remove unused keys**

Remove: `imageSlider`, `benefits` (will be replaced by `whyUs`), `testimonials`, `hero.statsImages`, `hero.statsUsers`, `hero.statsEvents`, `hero.scrollDown`, `hero.demoTitle`, `hero.liveBadge`, `howItWorks.step4Title`, `howItWorks.step4Description`, `howItWorks.qrCodeText`, `common.title`, `common.subtitle`, `common.comment` (feedback form keys).

- [ ] **Step 7: Commit**

```bash
git add locales/sr/translation.json
git commit -m "content: update Serbian translations for landing page redesign"
```

---

### Task 4: Update Translation Files (English)

**Files:**
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Mirror all Serbian changes in English**

Apply same structural changes as Task 3, with English text:

```json
"hero": {
  "eyebrow": "The simplest way to collect wedding photos",
  "titleLine1": "All your wedding",
  "titleLine2": "memories",
  "titleLine3": "in one place",
  "description": "Your guests take photos, you enjoy them. No WhatsApp groups, no compression, no hassle.",
  "primaryCta": "Get started in 2 minutes",
  "secondaryCta": "How it works",
  "trustPrivacy": "Private & secure",
  "trustSpeed": "2 min setup",
  "trustFree": "100% Free"
},
"painPoints": {
  "title": "Sound familiar?",
  "point1": "Photos scattered across 50+ guest phones",
  "point2": "Guests promise to send photos — they never do",
  "point3": "WhatsApp destroys photo quality",
  "point4": "No single place for all your memories"
},
"solution": {
  "title": "AddMemories solves everything.",
  "subtitle": "One link. All guests. All photos.",
  "imageAlt": "AddMemories app preview"
},
"socialProof": {
  "title": "Couples trust us",
  "statCouples": "couples have used it",
  "statGuests": "guests registered",
  "statCountries": "countries",
  "countriesList": "Serbia, Croatia, Bosnia, USA"
},
"whyUs": {
  "title": "Why AddMemories?",
  "benefit1Title": "Private",
  "benefit1Description": "Only your guests have access to your photos",
  "benefit2Title": "Fast",
  "benefit2Description": "2-minute setup, no installation needed",
  "benefit3Title": "Secure",
  "benefit3Description": "Photos stored in the cloud, available anytime",
  "ctaTitle": "Ready for your special day?",
  "ctaButton": "Get started in 2 minutes",
  "ctaSubtext": "Free. No credit card. No obligations."
},
"howItWorks": {
  "title": "How does it work?",
  "description": "Three simple steps to all your memories",
  "step1Title": "Create an event",
  "step1Description": "Register and create your event in 2 minutes",
  "step2Title": "Share the QR code",
  "step2Description": "Guests scan the code or open the link and upload photos",
  "step3Title": "Enjoy your photos",
  "step3Description": "All photos in one place, ready to download"
},
"faq": {
  "title": "Frequently Asked Questions",
  "subtitle": "Everything you need to know about AddMemories",
  "question1": "How does AddMemories work?",
  "answer1": "Create an event, share the link or QR code with guests, they upload photos directly from their phones. You download everything in one place.",
  "question2": "Is it really 100% free?",
  "answer2": "Yes, completely free. No hidden costs, no subscription, no credit card required.",
  "question3": "How many photos can guests upload?",
  "answer3": "Each guest can upload up to 10 photos in full resolution.",
  "question4": "Are the photos private and secure?",
  "answer4": "Yes, only you and your registered guests have access to the photos. Each event has a unique private link.",
  "question5": "How long are photos stored?",
  "answer5": "Photos are stored permanently in the cloud. You can download them whenever you want.",
  "question6": "Can it be used for events other than weddings?",
  "answer6": "Absolutely! AddMemories is perfect for christenings, birthdays, team building, and any event where you want to collect photos.",
  "question7": "Do guests need to install an app?",
  "answer7": "No, everything works directly in the web browser. Guests just open the link or scan the QR code — no installation needed."
},
"navbar": {
  "howItWorks": "How it works",
  "faq": "FAQ",
  "cta": "Get started",
  "menuOpen": "Open menu",
  "menuClose": "Close menu"
},
"footer": {
  "description": "The simplest way to collect wedding photos.",
  "copyright": "All rights reserved.",
  "privacyPolicy": "Privacy",
  "termsOfService": "Terms of Service",
  "contact": "Contact"
}
```

- [ ] **Step 2: Remove same unused keys as Task 3 Step 6**

- [ ] **Step 3: Commit**

```bash
git add locales/en/translation.json
git commit -m "content: update English translations for landing page redesign"
```

---

## Chunk 2: New Components (Navbar, PainPoints, Solution, SocialProof)

### Task 5: Create Navbar Component

**Files:**
- Create: `components/landingPage/Navbar.tsx`

- [ ] **Step 1: Create the Navbar component**

```tsx
"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
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
        isScrolled
          ? "bg-white/95 backdrop-blur-sm shadow-md"
          : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Glavna navigacija"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-playfair text-xl font-bold text-lp-primary">
            DodajUspomenu
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-lp-text hover:text-lp-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href={`/${getCurrentLanguageFromPath()}/admin/register`}
              className="px-5 py-2 text-sm font-semibold text-white bg-lp-primary rounded-lg hover:bg-lp-primary/90 transition-colors"
            >
              {t("navbar.cta")}
            </Link>
          </div>

          {/* Mobile hamburger */}
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

      {/* Mobile menu */}
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
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-lp-text hover:text-lp-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
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
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx --yes tsc --noEmit 2>&1 | grep -i navbar`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/landingPage/Navbar.tsx
git commit -m "feat: add sticky Navbar component with mobile hamburger menu"
```

---

### Task 6: Create PainPoints Component

**Files:**
- Create: `components/landingPage/PainPoints.tsx`

- [ ] **Step 1: Create the PainPoints component**

```tsx
"use client"

import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { CheckSquare } from "lucide-react"

export default function PainPoints() {
  const { t } = useTranslation()

  const points = [
    t("painPoints.point1"),
    t("painPoints.point2"),
    t("painPoints.point3"),
    t("painPoints.point4"),
  ]

  return (
    <section
      className="py-16 sm:py-20 bg-lp-muted"
      aria-labelledby="pain-points-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          id="pain-points-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-primary mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
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
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
            >
              <CheckSquare className="w-5 h-5 text-lp-accent flex-shrink-0" />
              <span className="text-lg text-lp-text">{point}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/PainPoints.tsx
git commit -m "feat: add PainPoints section with self-identification checklist"
```

---

### Task 7: Create Solution Component

**Files:**
- Create: `components/landingPage/Solution.tsx`

- [ ] **Step 1: Create the Solution component**

```tsx
"use client"

import Image from "next/image"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

export default function Solution() {
  const { t } = useTranslation()

  return (
    <section
      className="py-16 sm:py-20 bg-lp-bg"
      aria-labelledby="solution-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          id="solution-heading"
          className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-lp-primary mb-4"
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
          className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-lp-border"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Image
            src="/slider_pictures/3.png"
            alt={t("solution.imageAlt")}
            width={800}
            height={500}
            className="w-full h-auto"
            priority={false}
          />
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/Solution.tsx
git commit -m "feat: add Solution section with app screenshot"
```

---

### Task 8: Create SocialProof Component

**Files:**
- Create: `components/landingPage/SocialProof.tsx`

- [ ] **Step 1: Create the SocialProof component**

```tsx
"use client"

import Image from "next/image"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { Heart, Users, Globe } from "lucide-react"
import { useEffect, useState, useRef } from "react"

function useCounterAnimation(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
  }, [target, duration, hasAnimated])

  return { count, ref }
}

export default function SocialProof() {
  const { t } = useTranslation()
  const couples = useCounterAnimation(20)
  const guests = useCounterAnimation(100)
  const countries = useCounterAnimation(4)

  const stats = [
    {
      icon: Heart,
      value: couples.count,
      ref: couples.ref,
      suffix: "+",
      label: t("socialProof.statCouples"),
    },
    {
      icon: Users,
      value: guests.count,
      ref: guests.ref,
      suffix: "+",
      label: t("socialProof.statGuests"),
    },
    {
      icon: Globe,
      value: countries.count,
      ref: countries.ref,
      suffix: "",
      label: t("socialProof.statCountries"),
      sublabel: t("socialProof.countriesList"),
    },
  ]

  return (
    <section
      className="py-16 sm:py-20 bg-lp-muted"
      aria-labelledby="social-proof-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.h2
          id="social-proof-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-primary text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Icon className="w-8 h-8 text-lp-accent mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-lp-primary mb-1">
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

        {/* Product Hunt badge */}
        <motion.div
          className="flex justify-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AddMemories na Product Hunt"
          >
            <Image
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818"
              alt="AddMemories - Collect wedding photos from guests | Product Hunt"
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/SocialProof.tsx
git commit -m "feat: add SocialProof section with real stats and counter animation"
```

---

## Chunk 3: Rewrite Existing Components (Hero, HowItWorks, Benefits)

### Task 9: Rewrite HeroSection

**Files:**
- Rewrite: `components/landingPage/HeroSection.tsx`

- [ ] **Step 1: Rewrite HeroSection with split layout**

Replace entire file content with:

```tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion } from "framer-motion"
import { ArrowRight, Shield, Clock, CheckCircle, Sparkles } from "lucide-react"

export default function HeroSection() {
  const { t } = useTranslation()

  const trustIndicators = [
    { icon: Shield, text: t("hero.trustPrivacy") },
    { icon: Clock, text: t("hero.trustSpeed") },
    { icon: CheckCircle, text: t("hero.trustFree") },
  ]

  return (
    <section
      className="relative min-h-screen flex items-center bg-lp-bg pt-16"
      aria-labelledby="hero-heading"
    >
      {/* Language selector */}
      <div className="absolute top-20 right-6 z-40">
        <LanguageSelector className="backdrop-blur-md bg-white/80 shadow-lg border border-white/20" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lp-accent/10 border border-lp-accent/20">
              <Sparkles className="w-4 h-4 text-lp-accent" />
              <span className="text-sm font-semibold text-lp-accent">
                {t("hero.eyebrow")}
              </span>
            </div>

            {/* Headline */}
            <h1
              id="hero-heading"
              className="font-playfair text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-lp-primary"
            >
              {t("hero.titleLine1")}{" "}
              <span className="text-lp-accent">{t("hero.titleLine2")}</span>{" "}
              {t("hero.titleLine3")}
            </h1>

            {/* Description */}
            <p className="text-lg text-lp-muted-foreground max-w-lg leading-relaxed">
              {t("hero.description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${getCurrentLanguageFromPath()}/admin/register`}
                className="group inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white bg-lp-primary rounded-xl shadow-lg hover:shadow-xl hover:bg-lp-primary/90 transition-all"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#kako-radi"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-lp-primary bg-white border border-lp-border rounded-xl shadow-sm hover:shadow-md hover:bg-lp-muted transition-all"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-5 pt-2">
              {trustIndicators.map((indicator, index) => {
                const Icon = indicator.icon
                return (
                  <div key={index} className="flex items-center gap-2 text-lp-muted-foreground">
                    <Icon className="w-4 h-4 text-lp-primary" />
                    <span className="text-sm font-medium">{indicator.text}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
              {/* Phone notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />
              {/* Screen */}
              <div className="w-full h-full rounded-[2.25rem] overflow-hidden bg-white">
                <Image
                  src="/slider_pictures/1.png"
                  alt={t("hero.titleLine1")}
                  fill
                  className="object-cover"
                  priority
                  sizes="280px"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx --yes tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/landingPage/HeroSection.tsx
git commit -m "feat: rewrite HeroSection with split layout and phone mockup"
```

---

### Task 10: Rewrite HowItWorks (3 Steps)

**Files:**
- Rewrite: `components/landingPage/HowItWorks.tsx`

- [ ] **Step 1: Rewrite with 3-step horizontal layout**

Replace entire file:

```tsx
"use client"

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
    <section
      id="kako-radi"
      className="py-16 sm:py-20 bg-lp-bg"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="how-it-works-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-primary mb-3">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.description")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                {/* Number circle */}
                <div className="w-14 h-14 rounded-full bg-lp-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md">
                  {step.num}
                </div>
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-lp-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-lp-accent" />
                </div>
                <h3 className="text-xl font-bold text-lp-primary mb-2">{step.title}</h3>
                <p className="text-lp-muted-foreground">{step.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/HowItWorks.tsx
git commit -m "feat: rewrite HowItWorks with 3-step horizontal layout"
```

---

### Task 11: Rewrite Benefits as WhyUs + CTA

**Files:**
- Rewrite: `components/landingPage/Benefits.tsx`

- [ ] **Step 1: Rewrite as 3 benefits + CTA block**

Replace entire file:

```tsx
"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { Lock, Zap, Cloud, ArrowRight } from "lucide-react"

export default function Benefits() {
  const { t } = useTranslation()

  const benefits = [
    { icon: Lock, title: t("whyUs.benefit1Title"), description: t("whyUs.benefit1Description") },
    { icon: Zap, title: t("whyUs.benefit2Title"), description: t("whyUs.benefit2Description") },
    { icon: Cloud, title: t("whyUs.benefit3Title"), description: t("whyUs.benefit3Description") },
  ]

  return (
    <section
      className="py-16 sm:py-20 bg-lp-bg"
      aria-labelledby="why-us-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h2
          id="why-us-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-primary text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
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
                className="bg-white p-6 rounded-xl shadow-sm border border-lp-border text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4, shadow: "lg" }}
              >
                <div className="w-14 h-14 rounded-xl bg-lp-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-lp-accent" />
                </div>
                <h3 className="text-lg font-bold text-lp-primary mb-2">{benefit.title}</h3>
                <p className="text-sm text-lp-muted-foreground">{benefit.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* CTA Block */}
        <motion.div
          className="text-center bg-lp-muted rounded-2xl p-8 sm:p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="font-playfair text-2xl md:text-3xl font-bold text-lp-primary mb-4">
            {t("whyUs.ctaTitle")}
          </h3>
          <Link
            href={`/${getCurrentLanguageFromPath()}/admin/register`}
            className="group inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-lp-primary rounded-xl shadow-lg hover:shadow-xl hover:bg-lp-primary/90 transition-all"
          >
            {t("whyUs.ctaButton")}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-sm text-lp-muted-foreground mt-3">
            {t("whyUs.ctaSubtext")}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/Benefits.tsx
git commit -m "feat: rewrite Benefits as WhyUs section with CTA block"
```

---

## Chunk 4: Update FAQ, Footer, ClientPage, Cleanup

### Task 12: Update FAQ Component

**Files:**
- Modify: `components/landingPage/FAQ.tsx`

- [ ] **Step 1: Rewrite FAQ with 7 questions, simplified markup**

Replace entire file:

```tsx
"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

export default function FAQ() {
  const { t } = useTranslation()

  const faqItems = Array.from({ length: 7 }, (_, i) => ({
    question: t(`faq.question${i + 1}`),
    answer: t(`faq.answer${i + 1}`),
  }))

  return (
    <section
      id="faq"
      className="py-16 sm:py-20 bg-lp-bg"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="faq-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-primary mb-3">
            {t("faq.title")}
          </h2>
          <p className="text-lg text-lp-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion
            type="single"
            collapsible
            className="w-full bg-white border border-lp-border rounded-xl shadow-sm p-2 md:p-4"
          >
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-lp-primary hover:text-lp-accent transition-colors">
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
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/FAQ.tsx
git commit -m "feat: update FAQ with 7 questions, simplified styling"
```

---

### Task 13: Rewrite Footer

**Files:**
- Rewrite: `components/landingPage/Footer.tsx`

- [ ] **Step 1: Rewrite as simplified 2-column footer**

Replace entire file:

```tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { Instagram, ChevronUp } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function Footer() {
  const { t } = useTranslation()
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <footer className="bg-lp-muted py-12 border-t border-lp-border" role="contentinfo">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Left: Brand */}
          <div>
            <span className="font-playfair text-xl font-bold text-lp-primary">DodajUspomenu</span>
            <p className="text-sm text-lp-muted-foreground mt-2 max-w-xs">
              {t("footer.description")}
            </p>
          </div>

          {/* Right: Links + Social */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">
                {t("footer.privacyPolicy")}
              </Link>
              <Link href="/terms" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">
                {t("footer.termsOfService")}
              </Link>
              <Link href="/contact" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">
                {t("footer.contact")}
              </Link>
            </div>
            <div className="flex gap-4 items-start">
              <Link href="https://www.instagram.com/pixelnext9/" className="text-lp-muted-foreground hover:text-lp-accent transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="https://www.tiktok.com/@next.pixel9" className="text-lp-muted-foreground hover:text-lp-accent transition-colors" aria-label="TikTok">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.27 0 .54.03.79.1V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.65a6.34 6.34 0 0 0 10.86 4.48 6.29 6.29 0 0 0 1.83-4.48l.01-7.66a8.16 8.16 0 0 0 4.87 1.63v-3.45a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </Link>
              <Link href="https://x.com/nextpixel98" className="text-lp-muted-foreground hover:text-lp-accent transition-colors" aria-label="X (Twitter)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5549 21H20.7996L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-lp-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-lp-muted-foreground">
            &copy; {new Date().getFullYear()}{" "}
            <a href="https://www.nextpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-accent font-semibold hover:underline">
              Next Pixel
            </a>
            . {t("footer.copyright")}
          </div>

          {/* Product Hunt badge */}
          <a
            href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AddMemories na Product Hunt"
          >
            <Image
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818"
              alt="AddMemories on Product Hunt"
              width={120}
              height={26}
              style={{ width: "120px", height: "26px" }}
              unoptimized
            />
          </a>
        </div>
      </div>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-lp-primary text-white shadow-lg hover:bg-lp-primary/90 z-40"
            aria-label="Povratak na vrh"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landingPage/Footer.tsx
git commit -m "feat: rewrite Footer as simplified 2-column layout"
```

---

### Task 14: Update ClientPage — Assemble New Layout

**Files:**
- Modify: `components/ClientPage.tsx`

- [ ] **Step 1: Update imports and component order**

Replace entire file:

```tsx
"use client"

import { useTranslation } from "react-i18next"
import Navbar from "@/components/landingPage/Navbar"
import HeroSection from "@/components/landingPage/HeroSection"
import PainPoints from "@/components/landingPage/PainPoints"
import Solution from "@/components/landingPage/Solution"
import HowItWorks from "@/components/landingPage/HowItWorks"
import SocialProof from "@/components/landingPage/SocialProof"
import Benefits from "@/components/landingPage/Benefits"
import FAQ from "@/components/landingPage/FAQ"
import Footer from "@/components/landingPage/Footer"
import I18nProvider from "@/components/I18nProvider"

export default function ClientPage() {
  const { t } = useTranslation()

  return (
    <I18nProvider>
      <Navbar />
      <HeroSection />
      <PainPoints />
      <Solution />
      <HowItWorks />
      <SocialProof />
      <Benefits />
      <FAQ />
      <Footer />
    </I18nProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ClientPage.tsx
git commit -m "feat: update ClientPage with new section order and imports"
```

---

### Task 15: Remove Unused Components

**Files:**
- Delete: `components/landingPage/FooterCommentForm.tsx`
- Delete: `components/landingPage/ImageSlider.tsx`
- Delete: `components/landingPage/Testimonials.tsx`

- [ ] **Step 1: Verify no other files import these components**

Run:
```bash
grep -r "FooterCommentForm\|ImageSlider\|Testimonials" components/ app/ --include="*.tsx" --include="*.ts" -l
```

Expected: Only the files being deleted (and possibly `Footer.tsx` which was already rewritten without `FooterCommentForm`).

- [ ] **Step 2: Delete the files**

```bash
rm components/landingPage/FooterCommentForm.tsx
rm components/landingPage/ImageSlider.tsx
rm components/landingPage/Testimonials.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -u components/landingPage/
git commit -m "chore: remove unused FooterCommentForm, ImageSlider, Testimonials"
```

---

### Task 16: Final Verification

- [ ] **Step 1: TypeScript check**

Run: `npx --yes tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 2: Lint check**

Run: `npx next lint 2>&1 | tail -20`
Expected: No new errors related to landing page components

- [ ] **Step 3: Build check**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Visual check**

Run: `pnpm dev`
Open `http://localhost:3000` in browser. Verify:
- Navbar is sticky, transparent on top, solid on scroll
- Hero has split layout (text left, phone mockup right)
- Pain Points section shows 4 items with checkmarks
- Solution section shows app screenshot
- How It Works shows 3 numbered steps
- Social Proof shows 3 stat cards with counter animation
- Why Us shows 3 benefit cards + CTA block
- FAQ has 7 accordion items
- Footer is simplified with social links
- Mobile: all sections stack properly
- Language toggle works (SR/EN)

- [ ] **Step 5: Final commit with all remaining changes**

```bash
git add .
git commit -m "feat: complete landing page redesign with PAS conversion flow"
```

---

## Review Fixes Applied

### B1 FIX: HeroSection Image fill — add `relative` to screen div

In Task 9, the phone mockup screen div must have `relative` class:
```tsx
<div className="relative w-full h-full rounded-[2.25rem] overflow-hidden bg-white">
```

### B3 FIX: Update `--lp-secondary` in Task 1

Add step to Task 1: change `--lp-secondary: 325 30% 65%;` to `--lp-secondary: 36 50% 88%;`
Also update `--lp-secondary-foreground: 320 16% 20%;` to `--lp-secondary-foreground: 30 20% 25%;`

### B4 FIX: Update `--lp-border` in Task 1

Add step to Task 1: change `--lp-border: 325 20% 82%;` to `--lp-border: 325 20% 85%;`

### W2 FIX: Invalid Framer Motion shadow prop in Benefits

In Task 11, change:
```tsx
whileHover={{ y: -4, shadow: "lg" }}
```
to:
```tsx
whileHover={{ y: -4 }}
className="... hover:shadow-lg"
```
(Add `hover:shadow-lg` to the existing className, remove `shadow` from whileHover)

### W7 FIX: Move LanguageSelector into Navbar

In Task 5, add LanguageSelector import and place it in the desktop nav area (before the CTA button):
```tsx
import LanguageSelector from "@/components/LanguageSelector"
// ... inside desktop nav div:
<LanguageSelector className="text-sm" />
```
Also add it inside the mobile drawer.

Remove the LanguageSelector from HeroSection (Task 9) since it's now in Navbar.

### W8 FIX: Add Task 16.5 — Update SEO metadata

After Task 16, update `app/page.tsx` metadata to match new messaging:
- Title: "DodajUspomenu – Prikupite sve fotografije sa vjenčanja"
- Description: include PAS keywords about scattered photos problem

### W9 FIX: Add Task 16.6 — Update JSON-LD FAQ schema

Update the FAQ structured data in `app/layout.tsx` to match the 7 new FAQ questions from translation files.

### S3 FIX: Use `<a>` for external links in Footer

In Task 13, change `<Link>` to `<a target="_blank" rel="noopener noreferrer">` for Instagram, TikTok, X links.

### S4 FIX: Remove redundant Inter import from app/page.tsx

In Task 16 verification, remove the `Inter` import and `inter.className` from `app/page.tsx` since layout.tsx already handles it.
