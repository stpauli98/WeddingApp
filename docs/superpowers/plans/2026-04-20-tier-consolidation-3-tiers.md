# Plan: Tier consolidation (4 → 3), new caps, €25/€75 pricing, universal 30-day retention

## Context

Trenutni pricing setup ima **4 tier-a** (free/basic/premium/unlimited) sa različitim retention periodima (10/30/365/365 dana). Analiza unit economics (ranije u ovoj sesiji) otkrila je:

1. **Unlimited je marketing-inercija bez use-case-a.** Svadbeni max realno 150-200 gostiju × 20-30 slika = 3-6k slika. Unlimited (999 × 9999) je matematički nerealan, slabi trust u Premium ("da li je Premium dovoljno?"), povećava choice overload.
2. **Premium €40 + 365 dana storage je na rubu gubitka.** Cloudinary storage 12 meseci × ~10 GB = ~€43 cost; €40 revenue → marža pala u minus nakon payment processora.
3. **Free 10 × 20 × 10 dana** je u "siva zona" — dovoljno za malu svadbu/proslavu, nije čisto "demo", smanjuje konverziju ka paid tier-u.

**User-approved (2026-04-20) new structure:**

| Tier | Slika/gost | Gostiju | Retention | Cijena |
|---|---|---|---|---|
| **Free** (trial) | 3 | 20 | 30 dana | €0 |
| **Basic** (mainstream) | 7 | 100 | 30 dana | €25 |
| **Premium** (quality) | 25 | 300 | 30 dana | €75 |
| ~~Unlimited~~ | — | — | — | deprecated |

**Key changes:**
- 30-dana retention za sve (ne 365 za premium) — "ili si skinuo ili nisi, mjesec je dovoljno". Drastično smanjuje Cloudinary storage cost-ove.
- Ukinutu unlimited opciju (set `active: false` u DB, PricingPlan row ostaje za audit).
- Premium cijena raste €40 → €75 — premium positioning + pokriva pravi cost originalnog kvaliteta + 30-days storage (~€21 variable cost, net €51 poslije payment processor-a, ~68% gross margin).
- Basic cijena raste €20 → €25 — round number, anchor od 1/3 Premium-a.
- Grandfather: postojeći Premium/Unlimited event-i koji su plaćeni za 1 godinu čuvanja MORAJU zadržati 1 godinu (storageDays=30 u config-u + retentionOverrideDays=335 na event row-u → efektivno 365 dana retention).

**Add-on retention extension (€10/mjesec)** — mehanizam već postoji kroz `Event.retentionOverrideDays` polje. UI/payment flow za kupovinu je **followup feature**, ne u ovom PR-u. Za sad admin može ručno dodati retention preko Prisma Studio-a ili SQL-a.

## Ishod kad se završi

- Landing page prikazuje 3 kartice (Free / Basic / Premium) umjesto 4
- API `/api/pricing` filter po `active:true` automatski sakriva Unlimited
- New event signup koristi `basic=€25`, `premium=€75` cijene sa 30-dana retention-a
- Postojeći premium/unlimited event-i imaju `retentionOverrideDays=335` (grandfather do 365 dana)
- Postojeći basic event-i bez promjena (30 dana već)
- `PRICING_TIERS` const ažuriran sa novim vrijednostima; seed push-uje u DB

## File structure

| Fajl | Akcija | Responsibility |
|---|---|---|
| `lib/pricing-tiers.ts` | Modify | Update caps, prices, storageDays=30 za sve; unlimited entry ostaje ali dobija comment da je deprecated |
| `prisma/seed.ts` | Modify | Dodaj logic da setuje `active: false` za unlimited PricingPlan; ostatak je automatski iz PRICING_TIERS |
| **NEW** `scripts/grandfather-premium-retention.ts` | Create | One-off SQL: za Event rows sa pricingTier='premium' ili 'unlimited' kreiranim prije danas, setuj retentionOverrideDays=335 |
| `locales/sr/translation.json` | Modify | Pricing landing title/subtitle ako pominje broj tier-a (vjerovatno ne, ali provjeri) |
| `locales/en/translation.json` | Modify | Isto EN |
| `__tests__/pricing-tiers.test.ts` | Modify | Update expected price/cap values; remove unlimited assertion ako postoji |
| `__tests__/pricing-features.test.ts` | Modify | Mock plan sa novim caps; update expected feature strings (npr. "Do 7 slika po gostu" za basic) |
| `__tests__/api/upload-lifetime-limit.test.ts` | Modify | Mock `event.imageLimit` sa novim basic cap 7 (bio 25) — ili ostaviti kao 25 i dokumentovati da test koristi izmišljen tier |
| `CLAUDE.md` | Modify | Update pricing tier table u "Photo upload pipeline" sekciji |
| `claudedocs/pricing-tiers-plan.md` | Modify | Dopuni "tier consolidation (2026-04-20)" sekciju |

---

## Task 1: Pre-flight branch check + copy plan

**Files:** none

- [ ] **Step 1: Potvrdi stanje grane**

Run:
```bash
git status
git branch --show-current
```
Expected: `feat/guest-gallery-lightbox`, clean tree (samo `.claude/` + `docs/superpowers/plans/*` untracked).

- [ ] **Step 2: Copy plan u docs za durable reference**

Run:
```bash
cp /Users/nmil/.claude/plans/napravi-plan-implementacije-greedy-tiger.md docs/superpowers/plans/2026-04-20-tier-consolidation-3-tiers.md
```

---

## Task 2: Grandfather existing Premium/Unlimited events (HUMAN GATE + read-only prvo)

**Files:** none (DB inspection + update)

⚠️ Prije bilo kakve izmjene config-a, MORAMO grandfather-ovati postojeće event-e koji su plaćeni za 1 godinu retention-a. Inače im se retention skrati sa 365 na 30 dana.

- [ ] **Step 1: Provjeri postojeće event-e na premium/unlimited**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const events = await p.event.findMany({
    where: { pricingTier: { in: ["premium", "unlimited"] } },
    select: { id: true, slug: true, coupleName: true, pricingTier: true, retentionOverrideDays: true, createdAt: true, deletedAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${events.length} premium/unlimited events:`);
  for (const e of events) console.log(JSON.stringify(e, null, 2));
  await p.$disconnect();
}
main().catch((err) => { console.error(err); process.exit(1); });
' 2>&1 | tail -40
```
Expected: lista event-a. Očekivano 0-2 event-a u dev DB-u; saznati tačan broj prije nego što se ide dalje.

- [ ] **Step 2: HUMAN CONFIRMATION — pitaj user-a prije UPDATE-a**

Engineer: Prikaži listu event-a iz Step 1. Pitaj: *"Grandfather-ovaću ove event-e sa retentionOverrideDays=335 da zadrže efektivno 365-dana retention (30 iz config-a + 335 override = 365). Mogu li pokrenuti update?"* Wait za eksplicitno "da".

- [ ] **Step 3: Apply grandfather update (samo nakon potvrde)**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const result = await p.event.updateMany({
    where: {
      pricingTier: { in: ["premium", "unlimited"] },
      deletedAt: null,
      retentionOverrideDays: 0, // dont overwrite already-set overrides
    },
    data: { retentionOverrideDays: 335 },
  });
  console.log(`Grandfathered ${result.count} events.`);
  await p.$disconnect();
}
main().catch((err) => { console.error(err); process.exit(1); });
' 2>&1 | tail -5
```
Expected: `Grandfathered N events.` gdje N je broj event-a iz Step 1.

---

## Task 3: Update `lib/pricing-tiers.ts` config

**Files:**
- Modify: `lib/pricing-tiers.ts`

- [ ] **Step 1: Update PRICING_TIERS sa novim vrijednostima**

U `lib/pricing-tiers.ts`, zamijeni `PRICING_TIERS` const sadržaj tako da izgleda:

```ts
export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: { sr: 'Besplatno', en: 'Free' },
    imageLimit: 3,
    guestLimit: 20,
    storageDays: 30,
    price: 0,
    clientResizeMaxWidth: 1280,
    clientQuality: 0.85,
    storeOriginal: false,
    features: [
      { sr: 'Standardni QR kod', en: 'Standard QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
    ],
  },
  basic: {
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 7,
    guestLimit: 100,
    storageDays: 30,
    price: 2500, // €25
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: true,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 25,
    guestLimit: 300,
    storageDays: 30,
    price: 7500, // €75
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
  },
  // DEPRECATED 2026-04-20: konzolidacija 4→3 tiera. PricingPlan row postaje
  // active:false u DB-u (seed radi Step 2 niže). Config entry zadržan radi
  // Prisma enum compatibility + back-compat sa postojećim event-ima na
  // 'unlimited' tier-u (oni su grandfather-ovani u Task 2). NE pojavljuje
  // se na landing-u ili admin selector-u jer /api/pricing filtrira po active:true.
  unlimited: {
    name: { sr: 'Neograničeno (deprecated)', en: 'Unlimited (deprecated)' },
    imageLimit: 25, // matches premium — legacy events get treated as premium for new features
    guestLimit: 300,
    storageDays: 30,
    price: 7500,
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [],
    recommended: false,
  },
};
```

- [ ] **Step 2: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 4: Update seed — deactivate unlimited + push new values

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Dodaj explicit active flag per tier**

U `prisma/seed.ts`, `seedPricingPlans` funkciji, pronađi `const planData = { ... active: true, ... }` blok. Zamijeni `active: true` sa tier-aware logic:

```ts
const planData = {
  nameSr: config.name.sr,
  nameEn: config.name.en,
  imageLimit: config.imageLimit,
  clientResizeMaxWidth: config.clientResizeMaxWidth,
  clientQuality: config.clientQuality,
  storeOriginal: config.storeOriginal,
  price: config.price,
  recommended: config.recommended ?? false,
  sortOrder: sortOrder[tier] ?? 99,
  // Unlimited je deprecated (2026-04-20). Row ostaje u DB-u za
  // back-compat sa postojećim event-ima koji koriste taj enum value,
  // ali ne pojavljuje se na landing/admin zbog active:false.
  active: tier !== 'unlimited',
};
```

- [ ] **Step 2: Pokreni seed**

Run:
```bash
npx tsx prisma/seed.ts 2>&1 | tail -10
```
Expected: `✓ free: imageLimit=3, price=0`, `✓ basic: imageLimit=7, price=2500`, `✓ premium: imageLimit=25, price=7500`, `✓ unlimited: ...` (sa istim vrijednostima ali active:false).

- [ ] **Step 3: Verify DB state**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ select: { tier: true, imageLimit: true, price: true, active: true }, orderBy: { sortOrder: "asc" } });
  console.log(JSON.stringify(plans, null, 2));
  await p.$disconnect();
}
main().catch((err) => { console.error(err); process.exit(1); });
' 2>&1 | tail -30
```
Expected:
- free: imageLimit=3, price=0, active=true
- basic: imageLimit=7, price=2500, active=true
- premium: imageLimit=25, price=7500, active=true
- unlimited: active=false

---

## Task 5: Update `/api/pricing` fallback handling za unlimited

**Files:**
- Modify: `app/api/pricing/route.ts`

- [ ] **Step 1: Provjeri da API already filters by active**

Run:
```bash
grep -n "active" app/api/pricing/route.ts
```
Expected: linija `where: { active: true }` u `pricingPlan.findMany` query-ju. Ako nije tamo, dodaj.

- [ ] **Step 2: Update fallback branch — filter unlimited iz hardcoded fallback-a**

U `app/api/pricing/route.ts`, catch blok (hardcoded fallback) trenutno vraća SVE tier-ove iz `PRICING_TIERS`. Treba filtrirati unlimited da se poklopi sa DB ponašanjem.

Pronađi:
```ts
const result = Object.entries(PRICING_TIERS).map(([tier, config]) => ({
  tier,
  ...config,
}));
```

Zamijeni sa:
```ts
const result = Object.entries(PRICING_TIERS)
  .filter(([tier]) => tier !== 'unlimited') // deprecated
  .map(([tier, config]) => ({
    tier,
    ...config,
  }));
```

- [ ] **Step 3: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 6: Update `lib/pricing-db.ts` fallback isto

**Files:**
- Modify: `lib/pricing-db.ts`

- [ ] **Step 1: Filter unlimited u hardcoded fallback**

U `lib/pricing-db.ts`, `hardcodedFallback()` funkcija, pronađi `Object.entries(PRICING_TIERS)` map i dodaj isti filter `.filter(([tier]) => tier !== 'unlimited')`.

- [ ] **Step 2: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 7: Update testovi

**Files:**
- Modify: `__tests__/pricing-tiers.test.ts`
- Modify: `__tests__/pricing-features.test.ts`

- [ ] **Step 1: Update `pricing-tiers.test.ts`**

Postojeći testovi testiraju `getClientResizeParams`, `getQualityLabel`, `storeOriginal flag`. Ne testiraju specifičan imageLimit ili price value, pa ne bi trebalo da budu razbiti.

Run:
```bash
pnpm test:unit -- pricing-tiers
```
Expected: 8/8 PASS. Ako neki fail-uje, pogledaj expected value i uskladi sa novim config-om.

- [ ] **Step 2: Update `pricing-features.test.ts`**

Postojeći test `"starts with numeric bullets then appends DB features"` koristi mock plan `{ imageLimit: 25, guestLimit: 100, storageDays: 30 }`. Kao novi basic. Hard-coded assertion `expect(features[0]).toBe('Do 25 slika po gostu')` će fail-ovati ako test koristi `makePlan()` (basic defaults).

Pronađi `__tests__/pricing-features.test.ts`, vidi trenutne assertion-e. Update makePlan-ov default-e ili konkretne test-ove da koriste nove vrijednosti:

```ts
// Ako test koristi makePlan() za basic tier:
expect(features[0]).toBe('Do 7 slika po gostu');  // bio 25
expect(features[1]).toBe('Do 100 gostiju');       // ostaje 100 (basic guestLimit)
```

Run:
```bash
pnpm test:unit -- pricing-features
```
Expected: svi testovi PASS poslije update-a.

- [ ] **Step 3: Update `__tests__/api/upload-lifetime-limit.test.ts` mock**

U `beforeEach` bloku, event mock-u, `imageLimit` je vjerovatno 25 (basic stari default). Mock je samo za logiku lifetime cap-a, ne testira cap sam — ne treba izmjena ako test ne hardcode-uje tačan cap. Provjeri i ažuriraj ako je potrebno.

Run:
```bash
pnpm test:unit -- upload-lifetime-limit
```
Expected: 3/3 PASS.

- [ ] **Step 4: Full suite**

Run:
```bash
pnpm test:unit
```
Expected: **73 passed** (nema novih testova, samo update postojećih).

---

## Task 8: Docs refresh

**Files:**
- Modify: `CLAUDE.md`
- Modify: `claudedocs/pricing-tiers-plan.md`

- [ ] **Step 1: CLAUDE.md — update photo pipeline tier numbers**

U `CLAUDE.md`, pronađi liniju `enforces event.imageLimit (tier-based per /lib/pricing-tiers.ts: free=10, basic=25, premium=50, unlimited=999)` ili sličnu. Zamijeni sa:

```markdown
enforces `event.imageLimit` (tier-based per `/lib/pricing-tiers.ts`: free=3, basic=7, premium=25; unlimited deprecated 2026-04-20)
```

I `event.storageDays` mentions isto — sad svi su 30.

- [ ] **Step 2: `claudedocs/pricing-tiers-plan.md`**

Na kraj fajla dodaj:

```markdown
---

## Tier consolidation (2026-04-20)

Konzolidacija 4 → 3 tiera bazirana na unit economics analizi:

| Tier | Slika/gost | Gostiju | Retention | Cijena | Kvalitet |
|---|---|---|---|---|---|
| Free | 3 | 20 | 30 dana | €0 | Standard (1280px) |
| Basic | 7 | 100 | 30 dana | €25 | High (1600px) |
| Premium | 25 | 300 | 30 dana | €75 | Original (2560px+) |

**Unlimited deprecated** — PricingPlan row postaje active:false. Enum value `unlimited` ostaje u schema-i za back-compat sa postojećim event-ima (oni su grandfather-ovani sa retentionOverrideDays=335 → efektivno 365 dana retention).

**Retention dropped to 30 days** za sve tier-ove. Add-on "extend retention by 30 days" (€10/mo) je followup feature — mehanizam već postoji preko `Event.retentionOverrideDays` polja.

**Premium price €40 → €75** — dizanje cijene opravdano unit economics-om (original quality + storage cost) i premium positioning-om. Basic €20 → €25 je round-number + 1/3 Premium-a anchor.
```

---

## Task 9: Final verify + commit + push

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
Expected: build success, lint samo pre-existing warning, **73 tests passed**, audit exit 0.

- [ ] **Step 2: Manual QA pretpregled**

Run: `pnpm dev`, otvori `/sr` i `/en`.
Expected:
- Pricing sekcija ima **3 kartice** (Free / Basic / Premium)
- Cijene: €0 / €25 / €75
- Feature bullet-i prikazuju "Do 3 slika po gostu" / "Do 7 slika po gostu" / "Do 25 slika po gostu"
- "Slike se čuvaju 30 dana" na sve tri kartice
- Quality labels: Standard / High / Very High

- [ ] **Step 3: Commit + push**

Run:
```bash
git add \
  lib/pricing-tiers.ts \
  lib/pricing-db.ts \
  prisma/seed.ts \
  app/api/pricing/route.ts \
  __tests__/pricing-tiers.test.ts \
  __tests__/pricing-features.test.ts \
  __tests__/api/upload-lifetime-limit.test.ts \
  CLAUDE.md \
  claudedocs/pricing-tiers-plan.md \
  docs/superpowers/plans/2026-04-20-tier-consolidation-3-tiers.md

git commit -m "$(cat <<'EOF'
feat(pricing): consolidate 4→3 tiers with new caps + universal 30-day retention

Tier structure after unit economics analysis:
- Free: 3 img/guest × 20 guests, 30 days, €0 (trial signal)
- Basic: 7 × 100, 30 days, €25 (mainstream)
- Premium: 25 × 300, 30 days, €75 (quality + album print)
- Unlimited: deprecated (active:false in DB; enum value kept for
  back-compat with existing 'unlimited' tier events, which are
  grandfathered via retentionOverrideDays=335 to preserve their
  original 1-year retention promise)

Rationale:
- Premium €40 → €75 covers real cost of originals + healthy margin
  (60%+ gross); 4-tier was choice overload with no real use for
  unlimited caps (10k+ images is mathematically absurd for a wedding).
- 30-day retention universal: "either you downloaded in a month or you
  didn't". Cuts Cloudinary storage cost ~12x for premium events. Add-on
  "+30 days" for €10 is a followup feature using the existing
  Event.retentionOverrideDays mechanism.
- Free 3×20 is clearly "demo" — pushes trial users to paid after
  evaluating the product; 10×20 was close-enough-to-usable and lost
  conversion.

Existing events on premium or unlimited tier were grandfathered with
retentionOverrideDays=335 BEFORE config change so their promised
1-year retention stays intact. New events (after this deploy) get
30 days + optional add-on.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push
```

Expected: push uspješan, PR #4 se ažurira.

---

## Verifikacija (end-to-end)

```bash
# 1. CI zelen
gh pr checks 4

# 2. DB sanity
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ select: { tier: true, imageLimit: true, price: true, active: true } });
  console.log("Plans:", plans);
  const overrideEvents = await p.event.findMany({
    where: { retentionOverrideDays: { gt: 0 } },
    select: { slug: true, pricingTier: true, retentionOverrideDays: true },
  });
  console.log("Grandfathered events:", overrideEvents);
  await p.$disconnect();
}
main().catch(console.error);
' 2>&1 | tail -30
# Expected: 4 plans (free active, basic active, premium active, unlimited active:false),
# grandfathered events have retentionOverrideDays=335

# 3. Manual test na /sr landing page
# Expected: 3 kartice, tačne cijene, tačne brojke u metrikama, "Slike se čuvaju 30 dana" bullet
```

## Followups (out of scope za ovaj PR)

- **Retention extension add-on (€10/mjesec)** — admin UI za kupovinu produženja + payment flow kroz Lemon Squeezy. Mehanizam (`retentionOverrideDays`) već postoji, nedostaje payment front.
- **Migration postojećih basic event-a** sa 25 img/guest na 7 — NE želimo (ostavi grandfather, ne retroaktivno sječi limite). Novi event-i dobijaju novi cap; stari zadržavaju svoj `Event.imageLimit` koji je snap-ovan pri kreiranju.
- **Remove `unlimited` iz `PricingTier` enum-a** — zahtijeva kompleksnu Postgres enum migraciju + data cleanup. Skip dok postoje event-i sa tim tier-om.
- **Email switch na Resend/Postmark** — Gmail SMTP 500/dan limit će postati problem na ~30+ paid event-a mjesečno. Prelaz na transactional service (~€18/mj).
- **Storage arhitektura za scale** — ako Premium event-i počnu eksplodirati, S3 + CloudFront + lazy Cloudinary transforms može rezati 15-30x storage cost. Overkill za sad.
