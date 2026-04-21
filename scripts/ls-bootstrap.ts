// LS bootstrap — auto-populate .env.local sa LS varijabilama.
//
// ŠTA RADI (idempotentno):
// 1. Čita LS_API_KEY + LS_STORE_ID iz .env.local (ili iz env-a)
// 2. Verifikuje store postoji
// 3. Lista produkte u store-u; korisnik bira koji je wedding product
//    (ili script auto-pronalazi po imenu "DodajUspomenu")
// 4. Lista variante; auto-detektuje Basic (€25 = 2500c) + Premium (€75 = 7500c)
//    po cijeni, ne po imenu (ime može biti bilo šta)
// 5. Lista webhook-e; ako naš callback URL ne postoji — kreira ga
// 6. Ispiše ili upiše u .env.local: LS_VARIANT_ID_BASIC, LS_VARIANT_ID_PREMIUM, LS_WEBHOOK_SECRET
//
// USAGE:
//   Prvo ručno dodati u .env.local:
//     LS_API_KEY="..."        # iz Settings → API
//     LS_STORE_ID="..."       # iz URL-a /dashboard/stores/<id>
//
//   Zatim:
//     npx tsx scripts/ls-bootstrap.ts
//
//   Skripta dopunjuje .env.local sa preostala 3 ključa (ne briše postojeće).
//
//   Ako hoćeš dry-run (samo ispis, bez upisa u fajl):
//     npx tsx scripts/ls-bootstrap.ts --dry-run

import {
  lemonSqueezySetup,
  getStore,
  listProducts,
  listVariants,
  listWebhooks,
  createWebhook,
} from '@lemonsqueezy/lemonsqueezy.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local so script can read existing keys (LS_API_KEY, LS_STORE_ID)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const DRY_RUN = process.argv.includes('--dry-run');
const WEBHOOK_URL = 'https://www.dodajuspomenu.com/api/payments/webhook';
const PRODUCT_NAME_HINT = 'DodajUspomenu';

const BASIC_PRICE_CENTS = 2500;
const PREMIUM_PRICE_CENTS = 7500;

type EnvPair = [key: string, value: string];

function die(msg: string): never {
  console.error(`\nFAIL: ${msg}\n`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function info(msg: string) {
  console.log(`  → ${msg}`);
}

async function main() {
  console.log('Lemon Squeezy bootstrap\n');

  const apiKey = process.env.LS_API_KEY;
  const storeId = process.env.LS_STORE_ID;

  if (!apiKey) die('LS_API_KEY nije u .env.local. Dodaj ga prije pokretanja.');
  if (!storeId) die('LS_STORE_ID nije u .env.local. Dodaj ga prije pokretanja.');

  lemonSqueezySetup({
    apiKey,
    onError: (err) => console.error('LS SDK error:', err.message),
  });

  // Step 1: Verify store
  console.log('1. Verifikujem store…');
  const storeRes = await getStore(storeId);
  if (storeRes.error) die(`getStore(${storeId}) failed: ${storeRes.error.message}`);
  const store = storeRes.data?.data;
  if (!store) die(`Store ${storeId} ne postoji.`);
  ok(`store: ${store.attributes.name} (${store.attributes.domain})`);

  // Step 2: Find our product
  console.log('\n2. Tražim DodajUspomenu produkt…');
  const productsRes = await listProducts({ filter: { storeId: Number(storeId) } });
  if (productsRes.error) die(`listProducts failed: ${productsRes.error.message}`);
  const products = productsRes.data?.data || [];
  if (products.length === 0) die('Store nema nijedan produkt. Kreiraj "DodajUspomenu Event" prvo.');

  // Match by name (case-insensitive) or fallback to single-product assumption
  let product = products.find((p) =>
    p.attributes.name.toLowerCase().includes(PRODUCT_NAME_HINT.toLowerCase())
  );
  if (!product && products.length === 1) {
    product = products[0];
    info(`Nisam našao produkt s imenom koje sadrži "${PRODUCT_NAME_HINT}", ali samo je 1 produkt — koristim: ${product.attributes.name}`);
  } else if (!product) {
    const names = products.map((p) => `"${p.attributes.name}"`).join(', ');
    die(`Nađeno ${products.length} produkta u store-u: ${names}. Preimenuj jedan da sadrži "DodajUspomenu", ili proslijedi ime kroz LS_PRODUCT_NAME env.`);
  }
  ok(`produkt: ${product.attributes.name} (id=${product.id})`);

  // Step 3: Find variants by price
  console.log('\n3. Tražim variante po cijeni…');
  const variantsRes = await listVariants({ filter: { productId: Number(product.id) } });
  if (variantsRes.error) die(`listVariants failed: ${variantsRes.error.message}`);
  const variants = variantsRes.data?.data || [];
  if (variants.length === 0) die('Produkt nema variante. Kreiraj Basic (€25) + Premium (€75) prvo.');

  const basicVariant = variants.find((v) => v.attributes.price === BASIC_PRICE_CENTS);
  const premiumVariant = variants.find((v) => v.attributes.price === PREMIUM_PRICE_CENTS);

  if (!basicVariant) {
    const priceList = variants
      .map((v) => `"${v.attributes.name}" (${v.attributes.price / 100} EUR)`)
      .join(', ');
    die(`Nema variante sa cijenom €25.00. Postojeće variante: ${priceList}`);
  }
  if (!premiumVariant) {
    const priceList = variants
      .map((v) => `"${v.attributes.name}" (${v.attributes.price / 100} EUR)`)
      .join(', ');
    die(`Nema variante sa cijenom €75.00. Postojeće variante: ${priceList}`);
  }

  ok(`Basic variant: ${basicVariant.attributes.name} (id=${basicVariant.id}, €25.00)`);
  ok(`Premium variant: ${premiumVariant.attributes.name} (id=${premiumVariant.id}, €75.00)`);

  // Step 4: Webhook — check or create
  console.log('\n4. Provjeravam webhook…');
  const webhooksRes = await listWebhooks({ filter: { storeId: Number(storeId) } });
  if (webhooksRes.error) die(`listWebhooks failed: ${webhooksRes.error.message}`);
  const webhooks = webhooksRes.data?.data || [];

  let webhookSecret = process.env.LS_WEBHOOK_SECRET;
  const existingWebhook = webhooks.find((w) => w.attributes.url === WEBHOOK_URL);

  if (existingWebhook) {
    ok(`webhook već postoji (id=${existingWebhook.id})`);
    if (!webhookSecret) {
      info('ALI LS_WEBHOOK_SECRET nije u .env.local.');
      info('LS API NE vraća postojeći secret iz sigurnosnih razloga.');
      info('Idi u dashboard → Settings → Webhooks → klikni na webhook → "Reveal signing secret" → copy.');
      info('Dodaj ga ručno u .env.local pa ponovo pokreni ovaj script.');
    } else {
      ok(`LS_WEBHOOK_SECRET već u .env.local — ostavljam.`);
    }
  } else {
    info(`Kreiram novi webhook za ${WEBHOOK_URL}…`);
    if (DRY_RUN) {
      info('(dry-run — preskačem createWebhook)');
    } else {
      // LS generates a secret automatically and returns it ONCE
      const newSecret = generateSecret();
      const createRes = await createWebhook(storeId, {
        url: WEBHOOK_URL,
        events: ['order_created', 'order_refunded'],
        secret: newSecret,
      });
      if (createRes.error) die(`createWebhook failed: ${createRes.error.message}`);
      const created = createRes.data?.data;
      if (!created) die('createWebhook vratio prazan response.');
      webhookSecret = newSecret;
      ok(`webhook kreiran (id=${created.id}, secret generisan lokalno)`);
    }
  }

  // Step 5: Compose env updates
  console.log('\n5. Env output…');
  const updates: EnvPair[] = [
    ['LS_VARIANT_ID_BASIC', basicVariant.id],
    ['LS_VARIANT_ID_PREMIUM', premiumVariant.id],
  ];
  if (webhookSecret) {
    updates.push(['LS_WEBHOOK_SECRET', webhookSecret]);
  }

  if (DRY_RUN) {
    console.log('\n  --dry-run — ovo bi bilo upisano u .env.local:\n');
    for (const [k, v] of updates) {
      console.log(`  ${k}="${v}"`);
    }
    console.log('\n  (pokreni bez --dry-run da se upiše)\n');
    return;
  }

  // Step 6: Write to .env.local (preserve existing keys)
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  let updatedContent = existing;

  for (const [key, value] of updates) {
    const line = `${key}="${value}"`;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, line);
      ok(`update ${key}`);
    } else {
      if (!updatedContent.endsWith('\n')) updatedContent += '\n';
      updatedContent += line + '\n';
      ok(`add ${key}`);
    }
  }

  fs.writeFileSync(envPath, updatedContent, 'utf8');
  ok(`zapisano u ${envPath}`);

  console.log('\nGotovo. Sljedeći koraci:');
  console.log('  1. npx prisma migrate deploy   # primjeni Payment + WebhookLog migraciju na dev DB');
  console.log('  2. npx tsx prisma/seed.ts      # sync lsVariantId iz env u PricingPlan');
  console.log('  3. E2E test kroz UI (vidi docs/testing/payment-e2e-checklist.md)\n');
}

/**
 * Generate a 40-char hex secret (suitable for HMAC-SHA256).
 * LS minimum is 6 chars, ali hoćemo više entropije.
 */
function generateSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(20).toString('hex');
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
