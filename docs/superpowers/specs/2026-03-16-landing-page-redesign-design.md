# Landing Page Redesign — Design Specification

**Date**: 2026-03-16
**Status**: Approved
**Domain**: www.dodajuspomenu.com

## Context

WeddingApp (DodajUspomenu) is a SaaS for collecting wedding photos from guests. The current landing page is functional but has a generic appearance, hardcoded fake stats, inconsistent messaging, and suboptimal conversion flow. This redesign addresses all three pillars: visual identity, content/messaging, and conversion optimization.

## Target Audience

- Wedding couples aged 25-35, tech-savvy
- Mixed traffic sources: organic search, social media (Instagram, TikTok), word-of-mouth, wedding planner referrals
- Both "cold" visitors (need education) and "warm" visitors (already know what they want)

## Design Decisions

### Emotional Tone
Warm and emotional — focus on preserving memories, authentic wedding photography, storytelling.

### Color Palette (Dusty Rose Enhanced)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--lp-primary` | `340 25% 75%` | Dusty rose — buttons, headings |
| `--lp-accent` | `42 60% 70%` | Champagne gold — accents, icons, highlights |
| `--lp-bg` | `36 33% 97%` | Ivory — main background |
| `--lp-text` | `320 12% 18%` | Dark plum — body text |
| `--lp-muted` | `325 20% 92%` | Blush — secondary backgrounds |
| `--lp-card` | `0 0% 100%` | White — card surfaces |
| `--lp-primary-foreground` | `0 0% 100%` | White — text on primary buttons |
| `--lp-secondary` | `36 50% 88%` | Warm champagne — secondary elements |
| `--lp-border` | `325 20% 85%` | Soft rose — borders |

Key change: `--lp-accent` shifts from mauve (`325 16% 60%`) to champagne gold (`42 60% 70%`) for warmth and depth.

### Typography
- **Headlines**: Playfair Display (serif) — elegant, wedding-appropriate, emotional
- **Body**: Inter (sans-serif) — clean, readable, kept from current design
- Playfair Display must be preloaded in `app/layout.tsx` via `next/font/google`

### Conversion Strategy
PAS (Problem → Agitate → Solution) hybrid flow. Pain points before solution to activate self-identification in cold visitors. Warm visitors can skip directly to CTA.

## Page Structure (9 Sections)

### 1. Navbar
- **Behavior**: Sticky, transparent on top, solid white with shadow on scroll
- **Content**: Logo text ("DodajUspomenu" in Playfair Display) | anchor links ("Kako radi", "FAQ") | Language selector (SR/EN) | CTA button ("Počnite za 2 min")
- **Mobile**: Hamburger menu with slide-in drawer
- **Implementation**: New component `components/landingPage/Navbar.tsx`

### 2. Hero (Split Layout)
- **Layout**: 2-column grid. Left: text content. Right: phone mockup.
- **Left column**:
  - Eyebrow badge: small pill with icon + text (e.g., "#1 za svadbene slike")
  - Headline: Playfair Display, large (text-4xl to text-7xl responsive). "Sve uspomene sa vjenčanja na jednom mjestu" (or similar — finalize in translation files)
  - Subtext: 1-2 sentences, Inter, muted color. Problem + solution in one phrase.
  - Primary CTA: "Počnite za 2 minuta" (gradient button, dusty rose)
  - Secondary CTA: "Kako funkcioniše" (outlined, anchor to How It Works)
  - Trust indicators: 3 items below CTAs (🔒 Privatno, ⚡ Brzo, ✓ Besplatno)
- **Right column**:
  - Phone mockup frame containing wedding photos (simulating the app experience)
  - Image source: local `/public/images/` (not external URLs)
  - Slight float/rotate animation on load (subtle, not distracting)
- **Mobile**: Stacks vertically — text first, phone mockup below
- **Removed**: Parallax scroll effects, animated counters, gradient orbs
- **Component**: Rewrite `components/landingPage/HeroSection.tsx`

### 3. Pain Points ("Poznato vam je?")
- **Layout**: Centered column, slightly darker background (`--lp-muted`)
- **Headline**: "Poznato vam je?" in Playfair Display
- **Items** (4 pain points):
  1. "Fotografije razbacane po telefonima 50+ gostiju"
  2. "Gosti obećaju da će poslati slike — nikad ne pošalju"
  3. "WhatsApp uništava kvalitet fotografija"
  4. "Nema jednog mjesta za sve uspomene"
- **Visual style**: Checkbox/checkmark icon beside each item, large text
- **Animation**: Stagger fade-in on scroll (one item at a time, 150ms delay)
- **Component**: New `components/landingPage/PainPoints.tsx`

### 4. Solution
- **Layout**: Centered, ivory background
- **Headline**: "DodajUspomenu rješava sve." in Playfair Display
- **Subtext**: "Jedan link. Svi gosti. Sve fotografije." — three short phrases
- **Visual**: Centered app screenshot/mockup showing the guest upload flow
- **Animation**: Fade-in on scroll
- **Component**: New `components/landingPage/Solution.tsx`

### 5. How It Works (3 Steps)
- **Layout**: 3-column horizontal grid (vertical stack on mobile)
- **Steps**:
  1. **Kreirajte događaj** — "Registrujte se i kreirajte svoj event za 2 minute" (Icon: Users or PlusCircle)
  2. **Podijelite QR kod** — "Gosti skeniraju kod ili otvore link i šalju fotografije" (Icon: QrCode)
  3. **Uživajte u slikama** — "Sve slike su na jednom mjestu, spremne za preuzimanje" (Icon: Download or Heart)
- **Visual**: Numbered circles (①②③) with dusty rose background, connecting line/dots between them
- **Animation**: Stagger on scroll
- **Component**: Rewrite `components/landingPage/HowItWorks.tsx` (remove image, simplify to 3 steps)

### 6. Social Proof
- **Layout**: 3 stat cards in a row, centered
- **Stats** (real data):
  - "20+" / "parova koristilo" (icon: Heart)
  - "100+" / "gostiju registrovano" (icon: Users)
  - "4" / "zemlje" + "Srbija, Hrvatska, BiH, SAD" (icon: Globe)
- **Badge**: Product Hunt "Featured" badge below stats
- **Animation**: Counter animate on scroll (from 0 to target, but with REAL numbers)
- **Component**: New `components/landingPage/SocialProof.tsx`

### 7. Why Us + CTA
- **Layout**: 3 benefit cards + CTA block below
- **Benefits** (3 diferencijatora):
  1. 🔒 **Privatno** — "Samo vaši gosti imaju pristup vašim fotografijama"
  2. ⚡ **Brzo** — "Setup za 2 minuta, bez instalacije, bez komplikacija"
  3. ☁️ **Sigurno** — "Slike se čuvaju u oblaku, dostupne kad god poželite"
- **CTA block**:
  - Headline: "Spremni za najljepši dan?"
  - Button: "Počnite za 2 minuta" (same primary CTA style)
  - Subtext: "Besplatno. Bez kartice. Bez obaveza."
- **Component**: Rewrite `components/landingPage/Benefits.tsx` (reduce to 3 items, add CTA)

### 8. FAQ (6-7 Questions)
- **Format**: Accordion (Radix UI, keep existing component)
- **Questions**:
  1. Kako funkcioniše DodajUspomenu?
  2. Da li je zaista 100% besplatno?
  3. Koliko fotografija gosti mogu poslati?
  4. Da li su fotografije privatne i sigurne?
  5. Koliko dugo se čuvaju fotografije?
  6. Može li se koristiti i za druge događaje osim vjenčanja?
  7. Trebaju li gosti instalirati aplikaciju?
- **Translation**: Add new Q&A pairs to `locales/sr/translation.json` and `locales/en/translation.json`
- **Component**: Update `components/landingPage/FAQ.tsx` (keep accordion, update content)

### 9. Footer
- **Layout**: 2 columns. Left: brand info. Right: links + social.
- **Left column**: Logo text, one-line description, copyright with Next Pixel link
- **Right column**: Social icons (Instagram, TikTok, X), legal links (Privacy, Terms, Kontakt)
- **Product Hunt badge**: In footer
- **Scroll-to-top**: Keep existing animated button
- **Removed**: Feedback form (FooterCommentForm) — remove from footer, can be added as separate page later
- **Component**: Rewrite `components/landingPage/Footer.tsx`

## Components to Create
- `components/landingPage/Navbar.tsx` — NEW
- `components/landingPage/PainPoints.tsx` — NEW
- `components/landingPage/Solution.tsx` — NEW
- `components/landingPage/SocialProof.tsx` — NEW

## Components to Rewrite
- `components/landingPage/HeroSection.tsx` — Full rewrite (split layout, no parallax)
- `components/landingPage/HowItWorks.tsx` — Simplify to 3 steps, remove image
- `components/landingPage/Benefits.tsx` — Reduce to 3 items, add CTA block
- `components/landingPage/FAQ.tsx` — Add 3 new questions
- `components/landingPage/Footer.tsx` — Simplify, remove feedback form

## Components to Remove
- `components/landingPage/FooterCommentForm.tsx` — Remove from footer (keep file if feedback page planned)
- `components/landingPage/ImageSlider.tsx` — No longer used in new design
- `components/landingPage/Testimonials.tsx` — Already commented out, remove file

## Files to Update
- `components/ClientPage.tsx` — Update component imports and order
- `app/page.tsx` — No structural changes needed
- `locales/sr/translation.json` — Add Pain Points, Solution, Social Proof, Why Us translations; update FAQ; update Hero
- `locales/en/translation.json` — Same as above in English
- `styles/themes/wedding-theme.css` — Update `--lp-accent` to champagne gold, add any new tokens
- `app/layout.tsx` — Add Playfair Display font preload
- `tailwind.config.ts` — No changes needed (tokens already mapped from CSS vars)

## Animation Strategy
- **Keep**: `whileInView` fade-in on scroll, hover effects on cards/buttons
- **Add**: Stagger animation for Pain Points items, counter animation for Social Proof
- **Remove**: Parallax scroll, infinite gradient orbs, infinite background decorations
- **Library**: Framer Motion (already installed)
- **Performance**: All animations use `once: true` viewport option, no infinite loops

## Accessibility
- Semantic HTML maintained (section, nav, role, aria-labelledby)
- All images have alt text
- Keyboard navigation for accordion, navbar, CTAs
- Focus indicators on interactive elements
- Skip-to-content link in navbar
- Proper heading hierarchy (h1 in hero, h2 per section)
- `prefers-reduced-motion` media query — disable animations

## Performance Targets
- **LCP**: < 2.5s (phone mockup image optimized, font preloaded)
- **CLS**: < 0.1 (fixed dimensions on mockup, font-display: swap)
- **FID**: < 100ms (no heavy JS on load)
- All images local (no external URLs), served through Next.js Image optimization
- Playfair Display: preload woff2, font-display: swap

## Mobile Behavior
- All grids stack vertically on mobile
- Navbar collapses to hamburger
- Hero: text above, phone mockup below
- Pain Points: full width, stacked
- How It Works: vertical numbered list
- Stats: 1 column or horizontal scroll
- CTA buttons: full width on mobile

---

## Addendum: Review Fixes (2026-03-16)

### B1 FIX: Responsive Breakpoints

| Breakpoint | Width | Navbar | Hero | PainPoints | HowItWorks | SocialProof | WhyUs |
|------------|-------|--------|------|------------|------------|-------------|-------|
| mobile | <640px | Hamburger | 1-col stack | 1-col | 1-col vertical | 1-col stack | 1-col stack |
| sm | 640px | Hamburger | 1-col stack | 1-col | 1-col vertical | 1-col stack | 1-col stack |
| md | 768px | Full nav | 2-col grid | 1-col centered | 3-col horizontal | 3-col | 3-col |
| lg | 1024px | Full nav | 2-col grid | 1-col centered | 3-col horizontal | 3-col | 3-col |
| xl | 1280px | Full nav, max-w | 2-col grid, max-w | max-w-3xl | 3-col, max-w | 3-col, max-w | 3-col, max-w |

Container max-width: 1280px (xl breakpoint). Tailwind defaults used throughout.

### B2 FIX: CTA Destinations

| CTA | Destination | Notes |
|-----|-------------|-------|
| Primary "Počnite za 2 min" (Hero) | `/{lang}/admin/register` | Same as current, existing route |
| Secondary "Kako funkcioniše" (Hero) | `#kako-radi` | Smooth scroll anchor |
| Navbar CTA | `/{lang}/admin/register` | Same as primary |
| Why Us CTA (Section 7) | `/{lang}/admin/register` | Same as primary |
| Navbar "Kako radi" | `#kako-radi` | Anchor link |
| Navbar "FAQ" | `#faq` | Anchor link |

All CTA links use `getCurrentLanguageFromPath()` for language prefix, matching existing pattern.

### B3 FIX: Phone Mockup Asset Strategy

- **Approach**: CSS/SVG phone frame with real app screenshots embedded
- **Implementation**: A `<div>` styled as a phone bezel (rounded corners, notch, shadow) containing a Next.js `<Image>` component
- **Images**: Use existing slider screenshots from `/public/slider_pictures/` (1.png through 24.png) — these are real app screenshots already in the project
- **Display**: Show 1 static screenshot inside the phone frame (e.g., the guest upload screen)
- **Dimensions**: Phone frame 280x560px (desktop), scales down proportionally on mobile
- **Fallback**: If image fails to load, show a gradient placeholder with the app logo text

### W1 FIX: Anchor Link ID Mapping

| Navbar Label | Section ID | Target Section |
|-------------|------------|----------------|
| "Kako radi" | `kako-radi` | Section 5: How It Works |
| "FAQ" | `faq` | Section 8: FAQ |

### W2 FIX: Stats Data Source

Stats are **hardcoded constants** updated manually per deploy. This is explicitly acknowledged. Values represent real, verified minimums from the user database. No API endpoint needed. Values to hardcode:
- 20+ parova → derived from ~25 real admin accounts
- 100+ gostiju → derived from ~128 real guest registrations
- 4 zemlje → verified from registration data (Serbia, Croatia, BiH, USA)

### W3 FIX: Translation Key Estimate

Estimated new/updated keys per language:
- Navbar: 5 keys
- Hero: 10 keys (rewrite existing)
- Pain Points: 6 keys (new section)
- Solution: 4 keys (new section)
- How It Works: 8 keys (rewrite, reduce from 4 to 3 steps)
- Social Proof: 8 keys (new section)
- Why Us + CTA: 10 keys (rewrite Benefits)
- FAQ: 6 keys (3 new Q&A pairs)
- Footer: 4 keys (simplified)
- **Total: ~61 new/updated keys per language (122 total)**

### S3 FIX: SEO Meta Tags

SEO metadata already exists in app/page.tsx. Changes needed:
- Update title to match new messaging
- Update description to include PAS keywords
- Keep existing OpenGraph and Twitter card setup
- Domain already corrected to www.dodajuspomenu.com (fixed in prior session)

### S6 FIX: FAQ Questions Defined

1. Kako funkcioniše DodajUspomenu? → Kreirate event, podijelite link/QR kod gostima, oni uploaduju slike.
2. Da li je zaista 100% besplatno? → Da, potpuno besplatno. Bez skrivenih troškova.
3. Koliko fotografija gosti mogu poslati? → Svaki gost može poslati do 10 fotografija.
4. Da li su fotografije privatne i sigurne? → Da, samo vi i vaši gosti imaju pristup.
5. Koliko dugo se čuvaju fotografije? → Fotografije se čuvaju trajno u oblaku.
6. Može li se koristiti i za druge događaje? → Da — krštenja, rođendani, team building.
7. Trebaju li gosti instalirati aplikaciju? → Ne, sve radi preko web browsera.

### S8 NOTE: Dark Mode

Landing page explicitly disables dark mode. The `--lp-*` CSS variables are light-only. Dark mode is not planned for the landing page (wedding aesthetic requires light/warm tones). The admin dashboard can support dark mode independently.
