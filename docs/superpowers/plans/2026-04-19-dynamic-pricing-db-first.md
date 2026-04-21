# Plan: Dynamic Pricing Tier Data (DB-first) + 4-Metric Row Layout

## Context

`PRICING_TIERS` const u [lib/pricing-tiers.ts](lib/pricing-tiers.ts) je trenutno single source of truth. Sve UI komponente (`Pricing`, `PricingTierSelector`, `EventTierBadge`) čitaju iz hardcoded const-a; DB `PricingPlan` tabela je samo "echo" zasad (seed je push-only). Ako admin promijeni DB vrijednost (npr. `imageLimit` free plana sa 10 na 15), landing page + admin selector ne vide promjenu dok se ne rebuild-uje kod.

**Dodatni problem:** feature bullet-i kao "Do 10 slika po gostu" su **hardcodovani stringovi** u `PRICING_TIERS[tier].features[]` — broj je embedovan u tekst. Čak i ako UI čita iz DB-a, bullet-i ostaju statični jer su strukturirani kao plain strings, ne template-i.

**Target arhitektura:** DB = stvarna source of truth; komponente čitaju runtime iz `/api/pricing` (koji već postoji i čita iz DB-a); numerički bullet-i se generišu iz DB polja + i18n template-a (`{{count}}` placeholder-i); tier-specifični non-numeric features (npr. "Prilagođen QR kod") ostaju u `PricingFeature` DB tabeli.

**Dodatni UX zahtjev:** 4 metrike na pricing kartici (Camera/Users/Clock/Sparkles) trenutno stoje vertikalno. User želi da stoje **u jednom redu horizontalno** (side-by-side).

**Iz scope-a NIJE:** admin CRUD UI za uređivanje PricingPlan vrijednosti (to zahtijeva forma, validacije, cache invalidation — posebni feature). Za sad DB se uređuje kroz Prisma Studio / seed / SQL.

## Ishod

- Promjena `PricingPlan.imageLimit` u DB-u (preko Prisma Studio) je odmah vidljiva na landing page-u (sljedeći SSR render / page reload)
- `PRICING_TIERS` const ostaje build-time fallback kad DB nije dostupna
- Feature bullet-i sa brojkama su generisani od DB vrijednosti + i18n template-a
- 4 metrike na pricing kartici side-by-side u grid-u (`grid-cols-2 md:grid-cols-4`)

## File structure

| Fajl | Akcija | Odgovornost |
|---|---|---|
| **NEW** `lib/pricing-db.ts` | Create | Server-side `getPricingPlansFromDb()` helper sa fallback-om |
| **NEW** `lib/pricing-features.ts` | Create | `buildDynamicFeatures(plan, lang)` — gradi numeric bullets iz template-a + DB vrijednosti, kombinuje sa non-numeric DB features |
| `lib/pricing-tiers.ts` | Modify | Ukloni numeric bullets iz `features[]`, ostavi samo tier-specifične non-numeric features |
| `prisma/seed.ts` | Modify | Ista logika, manje strings (jer su numeric bullets uklonjene iz config-a) |
| **NEW** `scripts/cleanup-pricing-features.ts` | Create | One-off: briše `PricingFeature` rows koji sadrže brojke u tekstu (destructive, ručno pokrenuti) |
| `app/page.tsx` | Modify | Server component, fetch-uje `getPricingPlansFromDb()`, prosljeđuje `tiers` prop u `<ClientPage>` |
| `app/sr/page.tsx`, `app/en/page.tsx` | Modify | Isto |
| `components/ClientPage.tsx` | Modify | Prima `tiers` prop, prosljeđuje do `<Pricing tiers={...}>` |
| `components/landingPage/Pricing.tsx` | Modify | Prima `tiers` prop umjesto čitanja `PRICING_TIERS`, renderuje dynamic features preko `buildDynamicFeatures`; 4-metric layout u grid-u |
| `components/admin/PricingTierSelector.tsx` | Modify | Client useEffect fetch iz `/api/pricing`, loading skeleton, fallback na hardcoded na fail-u |
| `components/admin/EventTierBadge.tsx` | Modify | Isto — client fetch sa skeleton-om |
| `app/api/pricing/route.ts` | Modify | Već radi, ali sigurno da response uključuje sva potrebna polja (imageLimit, guestLimit, storageDays, quality fields) |
| `locales/sr/translation.json` | Modify | Novi `pricing.feature.*` template ključevi (imagesPerGuest, upToGuests, storageDays, storageYear) |
| `locales/en/translation.json` | Modify | Isto EN |
| **NEW** `__tests__/pricing-features.test.ts` | Create | Unit testovi za `buildDynamicFeatures` |
| `__tests__/pricing-tiers.test.ts` | Modify | Dopuni testove — `features[]` više ne sadrži numeric bullets |
| `CLAUDE.md` | Modify | Update arhitekture: DB-first pricing flow |
| `claudedocs/pricing-tiers-plan.md` | Modify | Zabilježi DB-first promjenu |

---

## Task 1: Pre-flight branch check

**Files:** none

- [ ] **Step 1: Clean tree + branch match**

Run:
```bash
git status
git branch --show-current
```
Expected: `feat/guest-gallery-lightbox` (stacked na gallery+quality work), tree clean ili samo untracked `.claude/` plan fajlovi.

- [ ] **Step 2: Copy plan u docs/superpowers/plans za durable reference**

Run:
```bash
cp /Users/nmil/.claude/plans/napravi-plan-implementacije-greedy-tiger.md docs/superpowers/plans/2026-04-19-dynamic-pricing-db-first.md
```

---

## Task 2: `lib/pricing-db.ts` — server-side DB fetch helper

**Files:**
- Create: `lib/pricing-db.ts`

- [ ] **Step 1: Kreiraj helper sa fallback-om**

Kreiraj `lib/pricing-db.ts`:

```ts
import { prisma } from '@/lib/prisma';
import { PRICING_TIERS, PricingTier, TierConfig } from '@/lib/pricing-tiers';

/**
 * Shape returned by the pricing DB helper. Closer to PricingPlan row shape
 * than TierConfig so components can reason about DB values directly.
 */
export type PricingPlanRow = {
  tier: PricingTier;
  name: { sr: string; en: string };
  imageLimit: number;
  guestLimit: number;
  storageDays: number;
  price: number;
  recommended: boolean;
  clientResizeMaxWidth: number;
  clientQuality: number;
  storeOriginal: boolean;
  /** Tier-specific non-numeric features (e.g. "Priority support"). */
  features: Array<{ sr: string; en: string }>;
};

/**
 * Read pricing plans from the DB with a hardcoded fallback.
 * Call site: landing page server component + admin APIs that need
 * fresh data without the HTTP roundtrip of /api/pricing.
 */
export async function getPricingPlansFromDb(): Promise<PricingPlanRow[]> {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { active: true },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map((plan) => ({
      tier: plan.tier as PricingTier,
      name: { sr: plan.nameSr, en: plan.nameEn },
      imageLimit: plan.imageLimit,
      // guestLimit + storageDays are not on PricingPlan yet — derive from config.
      // TODO: next phase, add these as DB columns. For now, stitch.
      guestLimit: PRICING_TIERS[plan.tier as PricingTier]?.guestLimit ?? 0,
      storageDays: PRICING_TIERS[plan.tier as PricingTier]?.storageDays ?? 0,
      price: plan.price,
      recommended: plan.recommended,
      clientResizeMaxWidth: plan.clientResizeMaxWidth,
      clientQuality: plan.clientQuality,
      storeOriginal: plan.storeOriginal,
      features: plan.features.map((f) => ({ sr: f.textSr, en: f.textEn })),
    }));
  } catch (err) {
    console.error('[pricing-db] fallback to hardcoded config:', err);
    return hardcodedFallback();
  }
}

function hardcodedFallback(): PricingPlanRow[] {
  return (Object.entries(PRICING_TIERS) as [PricingTier, TierConfig][]).map(
    ([tier, config]) => ({
      tier,
      name: config.name,
      imageLimit: config.imageLimit,
      guestLimit: config.guestLimit,
      storageDays: config.storageDays,
      price: config.price,
      recommended: config.recommended ?? false,
      clientResizeMaxWidth: config.clientResizeMaxWidth,
      clientQuality: config.clientQuality,
      storeOriginal: config.storeOriginal,
      features: config.features,
    })
  );
}
```

- [ ] **Step 2: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 3: `lib/pricing-features.ts` — dynamic feature bullet builder

**Files:**
- Create: `lib/pricing-features.ts`

- [ ] **Step 1: Helper koji spaja numeric template bullets sa DB features**

Kreiraj `lib/pricing-features.ts`:

```ts
import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { getQualityLabel } from '@/lib/pricing-tiers';

/**
 * Compose a feature bullet list for a tier by combining dynamic
 * template-rendered bullets (with numbers drawn from DB fields) and
 * the tier-specific non-numeric bullets stored in PricingFeature.
 *
 * Order: numeric bullets first (image limit, guest limit, storage, quality),
 * then DB feature rows.
 */
export function buildDynamicFeatures(
  plan: PricingPlanRow,
  lang: 'sr' | 'en',
  t: TFunction
): string[] {
  const out: string[] = [];

  // 1. Images per guest.
  out.push(
    t('pricing.feature.imagesPerGuest', {
      count: plan.imageLimit,
      defaultValue: lang === 'sr'
        ? `Do ${plan.imageLimit} slika po gostu`
        : `Up to ${plan.imageLimit} images per guest`,
    }) as string
  );

  // 2. Guest limit.
  out.push(
    t('pricing.feature.upToGuests', {
      count: plan.guestLimit,
      defaultValue: lang === 'sr'
        ? `Do ${plan.guestLimit} gostiju`
        : `Up to ${plan.guestLimit} guests`,
    }) as string
  );

  // 3. Storage days (or year).
  if (plan.storageDays >= 365) {
    out.push(
      t('pricing.feature.storageYear', {
        defaultValue: lang === 'sr' ? 'Slike se čuvaju 1 godinu' : 'Photos stored for 1 year',
      }) as string
    );
  } else {
    out.push(
      t('pricing.feature.storageDays', {
        count: plan.storageDays,
        defaultValue: lang === 'sr'
          ? `Slike se čuvaju ${plan.storageDays} dana`
          : `Photos stored for ${plan.storageDays} days`,
      }) as string
    );
  }

  // 4. Image quality (already a combined label from helper).
  out.push(getQualityLabel(plan.tier, lang));

  // 5. Tier-specific non-numeric features (e.g. "Priority support").
  for (const f of plan.features) {
    out.push(f[lang]);
  }

  return out;
}
```

- [ ] **Step 2: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 4: Očisti `PRICING_TIERS.features[]` — samo non-numeric tier-specific

**Files:**
- Modify: `lib/pricing-tiers.ts`

- [ ] **Step 1: Ukloni numeric bullets iz features array-a svakog tier-a**

U `lib/pricing-tiers.ts`, `PRICING_TIERS` const, za svaki tier u `features: [...]` **ukloni** sve bullets koji pominju brojke (`Do N slika po gostu`, `Do N gostiju`, `Slike se čuvaju N dana`, `Slike se čuvaju 1 godinu`, bilo koji `kvalitet (do Npx)` bullet) — te se sad generišu iz `buildDynamicFeatures`.

**Ostavi samo** tier-specifične features:

```ts
// free
features: [
  { sr: 'Standardni QR kod', en: 'Standard QR code' },
  { sr: 'Galerija fotografija', en: 'Photo gallery' },
  { sr: 'Preuzimanje svih slika', en: 'Download all images' },
],

// basic
features: [
  { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
  { sr: 'Prioritetna podrška', en: 'Priority support' },
],

// premium
features: [
  { sr: 'Napredni QR kod', en: 'Advanced QR code' },
  { sr: 'Prilagođen brending', en: 'Custom branding' },
  { sr: 'Prilagođene poruke', en: 'Custom messages' },
  { sr: 'Dedicirana podrška', en: 'Dedicated support' },
],

// unlimited
features: [
  { sr: 'Napredni QR kod', en: 'Advanced QR code' },
  { sr: 'Prilagođen brending', en: 'Custom branding' },
  { sr: 'Dedicirana podrška', en: 'Dedicated support' },
],
```

- [ ] **Step 2: TS + test check**

Run:
```bash
npx tsc --noEmit
pnpm test:unit -- pricing-tiers
```
Expected: TS 0. Test fail je OK za sad — postojeći `pricing-tiers.test.ts` provjerava storeOriginal flag (taj test ostaje), ali Task 12 će updateovati.

---

## Task 5: Seed update + DB cleanup (HUMAN GATE za cleanup script)

**Files:**
- Modify: `prisma/seed.ts` (nije potreban kod diff — već čita iz `PRICING_TIERS.features`)
- Create: `scripts/cleanup-pricing-features.ts`

- [ ] **Step 1: Verify seed script ne zahtijeva kod izmjene**

Run:
```bash
grep -n "features" prisma/seed.ts
```
Expected: seed radi `features: { create: config.features.map((f, i) => ({ textSr: f.sr, textEn: f.en, sortOrder: i })) }` — već čita iz `PRICING_TIERS`, ne treba izmjena. Nakon Task 4, seed će push-ovati skraćeni features array.

- [ ] **Step 2: Kreiraj cleanup script za postojeće DB rows**

Kreiraj `scripts/cleanup-pricing-features.ts`:

```ts
import { PrismaClient, PricingTier } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PRICING_TIERS } from '../lib/pricing-tiers';

/**
 * One-off cleanup: postojeći PricingFeature rows sadrže bullet-e kao
 * "Do 10 slika po gostu" koji su sad zastarjeli (generišu se dynamic-ally).
 * Ovaj script za svaki tier briše sve postojeće PricingFeature rows i
 * umeće svježe iz `PRICING_TIERS[tier].features` (koji sad sadrži samo
 * non-numeric tier-specific bullets poslije Task 4).
 *
 * Pokreni SAMO jednom, poslije deploy-a Task 4 izmjena.
 */

async function main() {
  const prisma = new PrismaClient().$extends(withAccelerate());

  for (const [tier, config] of Object.entries(PRICING_TIERS)) {
    const plan = await prisma.pricingPlan.findUnique({
      where: { tier: tier as PricingTier },
      include: { features: true },
    });
    if (!plan) {
      console.warn(`No PricingPlan found for tier=${tier}, skipping`);
      continue;
    }

    console.log(`[${tier}] deleting ${plan.features.length} old feature rows`);
    await prisma.pricingFeature.deleteMany({ where: { planId: plan.id } });

    console.log(`[${tier}] inserting ${config.features.length} fresh feature rows`);
    await prisma.pricingFeature.createMany({
      data: config.features.map((f, i) => ({
        planId: plan.id,
        textSr: f.sr,
        textEn: f.en,
        sortOrder: i,
      })),
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: HUMAN GATE — pitaj korisnika da li da se pokrene**

⚠️ Ovo briše sve postojeće `PricingFeature` rows i re-inserts. Nije rollback-friendly bez backup-a.

Engineer: reci korisniku šta script radi (iz Step 2 komentara), pitaj *"Mogu li pokrenuti `npx tsx scripts/cleanup-pricing-features.ts`?"*. Čekaj eksplicitno "da".

- [ ] **Step 4: Pokreni cleanup (samo nakon potvrde)**

Run:
```bash
npx tsx scripts/cleanup-pricing-features.ts 2>&1 | tail -20
```
Expected: za svaki od 4 tier-a, log `deleting N old feature rows` + `inserting M fresh feature rows`.

- [ ] **Step 5: Verify DB state**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ include: { features: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
  for (const plan of plans) {
    console.log(`\\n[${plan.tier}] ${plan.features.length} features:`);
    for (const f of plan.features) console.log(`  - ${f.textSr}`);
  }
  await p.$disconnect();
}
main().catch(console.error);
' 2>&1 | tail -30
```
Expected: za svaki tier samo tier-specifični non-numeric bullets (npr. basic ima 2: QR kod + Prioritetna podrška).

---

## Task 6: i18n template ključevi

**Files:**
- Modify: `locales/sr/translation.json`
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Dodaj `pricing.feature.*` ključeve u `locales/sr/translation.json`**

U `pricing` sekciji, dodaj:
```json
"feature": {
  "imagesPerGuest": "Do {{count}} slika po gostu",
  "upToGuests": "Do {{count}} gostiju",
  "storageDays": "Slike se čuvaju {{count}} dana",
  "storageYear": "Slike se čuvaju 1 godinu"
}
```

- [ ] **Step 2: Isto EN u `locales/en/translation.json`**

```json
"feature": {
  "imagesPerGuest": "Up to {{count}} images per guest",
  "upToGuests": "Up to {{count}} guests",
  "storageDays": "Photos stored for {{count}} days",
  "storageYear": "Photos stored for 1 year"
}
```

- [ ] **Step 3: JSON valid**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('locales/sr/translation.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('locales/en/translation.json', 'utf8'))"
```
Expected: oba exit 0.

---

## Task 7: Landing page server-side fetch (app/page.tsx + SR + EN)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/sr/page.tsx`
- Modify: `app/en/page.tsx`
- Modify: `components/ClientPage.tsx`

- [ ] **Step 1: `app/page.tsx` fetch + pass tiers**

Zamijeni `export default function Home()` sa async server component:

```tsx
import { Inter } from "next/font/google";
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";

const inter = Inter({ subsets: ["latin"] });

export default async function Home() {
  const tiers = await getPricingPlansFromDb();
  return (
    <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
      <ClientPage tiers={tiers} />
    </main>
  );
}
```

- [ ] **Step 2: Isto za `app/sr/page.tsx` i `app/en/page.tsx`**

Pročitaj oba fajla (koriste isti pattern kao `app/page.tsx`), dodaj `const tiers = await getPricingPlansFromDb()` i proslijedi `<ClientPage tiers={tiers} />`.

Ako fajlovi imaju različitu strukturu, minimalno pronađi `<ClientPage />` render i zamijeni sa `<ClientPage tiers={await getPricingPlansFromDb()} />` + učini funkciju `async`.

- [ ] **Step 3: `components/ClientPage.tsx` prihvata `tiers` prop**

U `components/ClientPage.tsx`:

```tsx
'use client'

import type { PricingPlanRow } from '@/lib/pricing-db';
import Navbar from "@/components/landingPage/Navbar"
// ... other imports
import Pricing from "@/components/landingPage/Pricing"
// ... other imports

export default function ClientPage({ tiers }: { tiers: PricingPlanRow[] }) {
  return (
    <I18nProvider>
      <Navbar />
      <HeroSection />
      <PainPoints />
      <Solution />
      <HowItWorks />
      <SocialProof />
      <Benefits />
      <Pricing tiers={tiers} />
      <FAQ />
      <Footer />
    </I18nProvider>
  )
}
```

- [ ] **Step 4: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka, ali **`Pricing` će prijaviti** da ne prima `tiers` prop yet — popravlja se u Task 8.

---

## Task 8: `Pricing.tsx` — prima tiers prop, dynamic features, 4-metric row layout

**Files:**
- Modify: `components/landingPage/Pricing.tsx`

- [ ] **Step 1: Cijelu komponentu refactoriraj**

Zamijeni cijeli `components/landingPage/Pricing.tsx` sadržaj sa:

```tsx
"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion } from "framer-motion"
import { Check, ArrowRight, Crown, Camera, Users, Clock, Sparkles } from "lucide-react"
import type { PricingPlanRow } from "@/lib/pricing-db"
import { buildDynamicFeatures } from "@/lib/pricing-features"
import { getQualityLabel } from "@/lib/pricing-tiers"

interface PricingProps {
  tiers: PricingPlanRow[];
}

export default function Pricing({ tiers }: PricingProps) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language || "sr") as "sr" | "en"

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
          {tiers.map((plan, index) => {
            const isRecommended = plan.recommended
            const features = buildDynamicFeatures(plan, lang, t)
            return (
              <motion.div
                key={plan.tier}
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
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1 bg-lp-accent text-white text-xs font-bold uppercase tracking-wide rounded-full shadow-md">
                    <Crown className="w-3 h-3" />
                    {t("pricing.mostPopular")}
                  </div>
                )}

                <h3 className={`text-xl font-bold mb-1 ${isRecommended ? "text-white" : "text-lp-text"}`}>
                  {plan.name[lang]}
                </h3>

                <div className="mb-6">
                  {plan.price === 0 ? (
                    <div className={`text-4xl font-bold ${isRecommended ? "text-white" : "text-lp-text"}`}>
                      {t("pricing.free")}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${isRecommended ? "text-white" : "text-lp-text"}`}>
                        {(plan.price / 100).toFixed(2)}
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

                {/* Key limits — 4 metrike side-by-side (2×2 na mobilnom, 1×4 na sm+) */}
                <div className={`rounded-xl p-3 mb-6 ${
                  isRecommended ? "bg-white/10" : "bg-lp-muted/50"
                }`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Metric
                      icon={Camera}
                      label={String(plan.imageLimit)}
                      hint={t("pricing.photosPerGuest")}
                      inverted={!!isRecommended}
                    />
                    <Metric
                      icon={Users}
                      label={String(plan.guestLimit)}
                      hint={lang === "sr" ? "gostiju" : "guests"}
                      inverted={!!isRecommended}
                    />
                    <Metric
                      icon={Clock}
                      label={plan.storageDays >= 365 ? (lang === "sr" ? "1 god." : "1 yr") : `${plan.storageDays}d`}
                      hint={lang === "sr" ? "čuvanje" : "storage"}
                      inverted={!!isRecommended}
                    />
                    <Metric
                      icon={Sparkles}
                      label={getQualityLabel(plan.tier, lang).split("(")[0].trim()}
                      hint={lang === "sr" ? "kvalitet" : "quality"}
                      inverted={!!isRecommended}
                    />
                  </div>
                </div>

                {/* Feature list — dynamic bullets */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isRecommended ? "text-white/90" : "text-lp-accent"}`} />
                      <span className={`text-sm ${isRecommended ? "text-white/90" : "text-lp-muted-foreground"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${getCurrentLanguageFromPath()}/admin/register?tier=${plan.tier}`}
                  className={`group inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isRecommended
                      ? "bg-white text-lp-primary hover:bg-white/90 shadow-md"
                      : "bg-lp-primary text-white hover:bg-lp-primary/90"
                  }`}
                >
                  {plan.price === 0 ? t("pricing.startFree") : t("pricing.choosePlan")}
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            )
          })}
        </div>

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

function Metric({
  icon: Icon,
  label,
  hint,
  inverted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  inverted: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className={`w-5 h-5 mb-1 ${inverted ? "text-white/90" : "text-lp-accent"}`} />
      <span className={`text-sm font-semibold truncate max-w-full ${inverted ? "text-white" : "text-lp-text"}`}>
        {label}
      </span>
      <span className={`text-[10px] uppercase tracking-wide mt-0.5 truncate max-w-full ${inverted ? "text-white/70" : "text-lp-muted-foreground"}`}>
        {hint}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: TS + build**

Run:
```bash
npx tsc --noEmit
rm -rf .next && pnpm build 2>&1 | tail -3
```
Expected: TS 0 grešaka, build success.

---

## Task 9: Admin `PricingTierSelector` — client fetch iz API

**Files:**
- Modify: `components/admin/PricingTierSelector.tsx`

- [ ] **Step 1: Dodaj state + useEffect za fetch**

U `components/admin/PricingTierSelector.tsx`, na vrh komponenta dodaj:

```tsx
import { useEffect, useState } from 'react';

// ... unutar komponenta, na vrh:
const [tiers, setTiers] = useState<Array<{
  tier: PricingTier;
  imageLimit: number;
  price: number;
  recommended: boolean;
  name: { sr: string; en: string };
}> | null>(null);

useEffect(() => {
  let cancelled = false;
  fetch('/api/pricing')
    .then((r) => r.json())
    .then((data) => {
      if (!cancelled) setTiers(data);
    })
    .catch((err) => {
      console.error('[pricing-selector] fallback to hardcoded:', err);
      if (!cancelled) {
        // Fallback na hardcoded PRICING_TIERS
        setTiers(
          (Object.keys(PRICING_TIERS) as PricingTier[]).map((t) => ({
            tier: t,
            imageLimit: PRICING_TIERS[t].imageLimit,
            price: PRICING_TIERS[t].price,
            recommended: PRICING_TIERS[t].recommended ?? false,
            name: PRICING_TIERS[t].name,
          }))
        );
      }
    });
  return () => {
    cancelled = true;
  };
}, []);
```

- [ ] **Step 2: Render loading skeleton + replace map**

Zamijeni postojeći `{(Object.keys(PRICING_TIERS) as PricingTier[]).map((tier) => { const config = PRICING_TIERS[tier]; ... })}` sa:

```tsx
{tiers === null ? (
  <div className="space-y-3">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="h-[72px] rounded-lg bg-[hsl(var(--lp-muted))] animate-pulse" />
    ))}
  </div>
) : (
  tiers.map(({ tier, imageLimit, price, recommended, name }) => {
    const isSelected = selectedTier === tier;
    const isRecommended = recommended;
    // ... postojeća JSX struktura, ali koristi `imageLimit`, `price`, `name[language]` umjesto `config.imageLimit` itd.
    // getQualityLabel(tier, language) i dalje poziva se iz statičkog helper-a
  })
)}
```

Zadrži JSX strukturu iz postojećeg koda, samo zamijeni izvor vrijednosti sa `config.X` na lokalne `X` varijable iz destruktiranog `tiers.map` item-a.

- [ ] **Step 3: TS + build**

Run:
```bash
npx tsc --noEmit
pnpm build 2>&1 | tail -3
```
Expected: 0 grešaka, build success.

---

## Task 10: Admin `EventTierBadge` — client fetch + dynamic features

**Files:**
- Modify: `components/admin/EventTierBadge.tsx`

- [ ] **Step 1: Dodaj fetch + state za jedan tier**

Trenutno komponenta uzima samo `tier` prop i čita features iz hardcoded config-a. Nakon refactor-a čita iz API-ja.

U `components/admin/EventTierBadge.tsx`, zamijeni komponentu sa:

```tsx
"use client";

import { useEffect, useState } from 'react';
import { PRICING_TIERS, PricingTier, getTierName } from '@/lib/pricing-tiers';
import { buildDynamicFeatures } from '@/lib/pricing-features';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EventTierBadgeProps {
  tier: PricingTier;
  imageLimit: number;
  language?: 'sr' | 'en';
  variant?: 'badge' | 'card';
}

export function EventTierBadge({ tier, imageLimit, language = 'sr', variant = 'badge' }: EventTierBadgeProps) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<PricingPlanRow | null>(null);
  const tierName = getTierName(tier, language);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((data: PricingPlanRow[]) => {
        if (!cancelled) {
          const found = data.find((p) => p.tier === tier);
          setPlan(found ?? null);
        }
      })
      .catch((err) => console.error('[tier-badge] fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, [tier]);

  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={tier === 'free' ? 'secondary' : 'default'}
          className="text-sm font-medium"
        >
          {tierName}
        </Badge>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <ImageIcon className="h-4 w-4" />
          {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
        </span>
      </div>
    );
  }

  const features = plan
    ? buildDynamicFeatures(plan, language, t)
    : PRICING_TIERS[tier].features.map((f) => f[language]); // fallback

  const price = plan?.price ?? PRICING_TIERS[tier].price;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{tierName}</CardTitle>
            <CardDescription>
              {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
            </CardDescription>
          </div>
          {price > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">{(price / 100).toFixed(2)} EUR</div>
              <div className="text-xs text-muted-foreground">
                {language === 'sr' ? 'po događaju' : 'per event'}
              </div>
            </div>
          )}
          {price === 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {t('admin.event.pricing.free', 'Besplatno')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: TS + build**

Run:
```bash
npx tsc --noEmit
pnpm build 2>&1 | tail -3
```
Expected: 0 grešaka, success.

---

## Task 11: Update `__tests__/pricing-tiers.test.ts`

**Files:**
- Modify: `__tests__/pricing-tiers.test.ts`

- [ ] **Step 1: Ukloni assertion-e koji ovise o uklonjenim numeric feature-ima**

Pročitaj postojeći `__tests__/pricing-tiers.test.ts`. Ako sadrži testove koji provjeravaju postojanje "Do 10 slika po gostu" u `features[]` array-u, ukloni ih. Postojeći testovi `getClientResizeParams`, `getQualityLabel`, `storeOriginal flag` ostaju netaknuti.

Run:
```bash
pnpm test:unit -- pricing-tiers
```
Expected: svi testovi PASS.

---

## Task 12: Novi `__tests__/pricing-features.test.ts`

**Files:**
- Create: `__tests__/pricing-features.test.ts`

- [ ] **Step 1: Kreiraj test**

```ts
/**
 * @jest-environment node
 */
import { buildDynamicFeatures } from '@/lib/pricing-features';
import type { PricingPlanRow } from '@/lib/pricing-db';
import type { TFunction } from 'i18next';

// Stub i18n: koristi defaultValue argumenta t()
const mockT = ((key: string, opts?: any) => opts?.defaultValue ?? key) as unknown as TFunction;

function makePlan(overrides: Partial<PricingPlanRow> = {}): PricingPlanRow {
  return {
    tier: 'basic',
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 25,
    guestLimit: 100,
    storageDays: 30,
    price: 1999,
    recommended: true,
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [{ sr: 'Prilagođen QR kod', en: 'Custom QR code' }],
    ...overrides,
  };
}

describe('buildDynamicFeatures', () => {
  it('starts with numeric bullets then appends DB features', () => {
    const plan = makePlan();
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features[0]).toBe('Do 25 slika po gostu');
    expect(features[1]).toBe('Do 100 gostiju');
    expect(features[2]).toBe('Slike se čuvaju 30 dana');
    expect(features[3]).toContain('Visok kvalitet');
    expect(features[4]).toBe('Prilagođen QR kod');
  });

  it('uses storageYear when storageDays >= 365', () => {
    const plan = makePlan({ storageDays: 365 });
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features[2]).toBe('Slike se čuvaju 1 godinu');
  });

  it('renders English when lang=en', () => {
    const plan = makePlan();
    const features = buildDynamicFeatures(plan, 'en', mockT);
    expect(features[0]).toBe('Up to 25 images per guest');
    expect(features[1]).toBe('Up to 100 guests');
    expect(features[2]).toBe('Photos stored for 30 days');
    expect(features[3]).toContain('High quality');
    expect(features[4]).toBe('Custom QR code');
  });

  it('handles empty DB features array gracefully', () => {
    const plan = makePlan({ features: [] });
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features.length).toBe(4); // 4 numeric bullets, no DB tail
  });
});
```

- [ ] **Step 2: Run**

Run:
```bash
pnpm test:unit -- pricing-features
```
Expected: 4 testa PASS.

- [ ] **Step 3: Full suite**

Run:
```bash
pnpm test:unit
```
Expected: 73 passed (69 postojećih + 4 nova).

---

## Task 13: Docs refresh

**Files:**
- Modify: `CLAUDE.md`
- Modify: `claudedocs/pricing-tiers-plan.md`

- [ ] **Step 1: `CLAUDE.md` — dodaj "Pricing data flow" sekciju poslije "Photo upload pipeline"**

Pronađi sekciju "Photo upload pipeline" u `CLAUDE.md`. Odmah nakon nje dodaj:

```markdown
### Pricing data flow (DB-first)

`lib/pricing-tiers.ts` je **build-time fallback** config + source za seed. **Runtime source of truth** je `PricingPlan` + `PricingFeature` DB tabele.

- Landing page (`app/page.tsx` server component) → `getPricingPlansFromDb()` helper → `<Pricing tiers={...}>`
- Admin komponenti (`PricingTierSelector`, `EventTierBadge`) → client fetch iz `/api/pricing` sa skeleton loading + fallback na hardcoded na error
- Feature bullet list dinamički generisan u `lib/pricing-features.ts` `buildDynamicFeatures()`: numeric bullets (imageLimit, guestLimit, storageDays, quality) iz DB polja + i18n template-a, plus non-numeric tier-specific features iz `PricingFeature` DB rows

**Napomena za izmjenu pricing-a:** promjena u `PricingPlan.imageLimit` (preko Prisma Studio ili SQL-a) odmah je vidljiva na landing page-u bez rebuild-a. Non-numeric features (npr. "Prilagođen QR kod") se mijenjaju kroz `PricingFeature` tabelu. `lib/pricing-tiers.ts` se mijenja samo kad se uvodi novi tier ili mijenja schema — onda `npx tsx prisma/seed.ts` push-uje nove vrijednosti u DB.
```

- [ ] **Step 2: `claudedocs/pricing-tiers-plan.md` — dopuni quality gradient sekciju**

Na kraju fajla dodaj:

```markdown
---

## DB-first pricing refactor (2026-04-19)

Prije: `PRICING_TIERS` const je bio single source of truth; UI čitao hardcoded.
Poslije: DB (`PricingPlan` + `PricingFeature`) je runtime source of truth. `PRICING_TIERS` ostaje build-time fallback + seed source.

Ključni fajlovi:
- `lib/pricing-db.ts` — `getPricingPlansFromDb()` za server components
- `lib/pricing-features.ts` — `buildDynamicFeatures()` za template-based bullet rendering
- `/api/pricing` — runtime REST endpoint za client components

Ako admin dashboard u budućnosti dobije formu za uređivanje pricing-a, ova arhitektura već podržava trenutnu propagaciju promjena.
```

---

## Task 14: Final verify + commit + push

**Files:** none

- [ ] **Step 1: Full local verify**

Run:
```bash
rm -rf .next
pnpm build
pnpm lint
pnpm test:unit
pnpm audit --prod --audit-level=high
```
Expected: build success, lint samo pre-existing warning, tests **73 passed**, audit exit 0.

- [ ] **Step 2: Manual QA pretpregled**

Run: `pnpm dev`, otvori `/sr` i `/en`. Provjeri:
- Pricing kartice imaju 4 metrike u 2×2 grid-u (mobile) / 1×4 row (desktop)
- Feature bullet-i su kratki tier-specifični items + numeric bullets generisani dinamički
- Otvori Prisma Studio (`npx prisma studio`) → promijeni `PricingPlan.imageLimit` za free sa 10 na 15 → refresh `/sr` → prvi bullet "Do 15 slika po gostu"

- [ ] **Step 3: Commit + push**

Run:
```bash
git add \
  lib/pricing-db.ts \
  lib/pricing-features.ts \
  lib/pricing-tiers.ts \
  prisma/seed.ts \
  scripts/cleanup-pricing-features.ts \
  app/page.tsx app/sr/page.tsx app/en/page.tsx \
  components/ClientPage.tsx \
  components/landingPage/Pricing.tsx \
  components/admin/PricingTierSelector.tsx \
  components/admin/EventTierBadge.tsx \
  locales/sr/translation.json locales/en/translation.json \
  __tests__/pricing-features.test.ts __tests__/pricing-tiers.test.ts \
  CLAUDE.md claudedocs/pricing-tiers-plan.md \
  docs/superpowers/plans/2026-04-19-dynamic-pricing-db-first.md

git commit -m "feat(pricing): DB-first dynamic pricing data + 4-metric row layout

Promjena u PricingPlan vrijednostima (preko Prisma Studio ili SQL-a)
sada se odmah reflektuje na landing page-u i u admin UI-u bez rebuild-a.
Feature bullet-i sa brojevima su generisani dinamički iz DB polja +
i18n template-a; non-numeric tier-specific bullets ostaju u
PricingFeature DB tabeli.

Landing Pricing card takođe refactorisan: 4 metrike (Camera, Users,
Clock, Sparkles) sad stoje side-by-side u 2×2 grid-u na mobile-u
i 1×4 na sm+, umjesto prethodnog vertikalnog stack-a.

Arhitektura:
- lib/pricing-db.ts: getPricingPlansFromDb() za server komponente
- lib/pricing-features.ts: buildDynamicFeatures() za template rendering
- /api/pricing: runtime endpoint za admin client komponente
- PRICING_TIERS u lib/pricing-tiers.ts ostaje build-time fallback

One-off cleanup script (scripts/cleanup-pricing-features.ts) briše
postojeće PricingFeature rows koji sadrže numeric bullets ('Do 10 slika
po gostu' itd.) i re-inserts iz svježeg config-a (u kojem su te
bullets uklonjene — sad se generišu dinamički).

Tests: +4 nova u pricing-features.test.ts. 73 unit tests pass,
TS clean, build green, audit exit 0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push
```

Expected: push uspješan, PR #4 ažuriran.

---

## Verifikacija (end-to-end)

```bash
# 1. CI zelen
gh pr checks 4

# 2. DB sanity — promijeni vrijednost ručno pa provjeri UI
npx prisma studio
# U browseru: PricingPlan → free → promijeni imageLimit sa 10 na 15 → save
# Refresh localhost:3001/sr → Pricing kartica za Besplatno treba prikazati "Do 15 slika po gostu"
# Vrati nazad na 10 (ili ne, kako želiš)

# 3. Admin flow
# Login kao admin → otvori /sr/admin/event (ili gdje je tier selector)
# Vidi da selector prikazuje pravilne brojeve iz DB-a

# 4. Regression check
# Upload-Form + SwipeLightbox + delete + lifetime cap iz prethodnih PR-ova — sve i dalje radi
```

## Followups (out of scope)

- **Admin CRUD forma za uređivanje PricingPlan vrijednosti** — UI gdje admin mijenja pricing kroz web interface (bez Prisma Studio-a). Odvojen feature sa formama + validacija + cache invalidation.
- **Cache / revalidation strategija** — trenutno landing page SSR dohvata DB na svaki request. Za masovnu produkciju dodati ISR sa `revalidate: 60` ili in-memory cache sa TTL-om.
- **guestLimit + storageDays na DB-u** — trenutno `lib/pricing-db.ts` stitch-uje ova dva polja iz hardcoded config-a jer nisu na `PricingPlan` tabeli. Kad postanu potrebni DB-first, dodati kao kolone + migration.
