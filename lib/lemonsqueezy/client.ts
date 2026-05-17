import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export interface CustomCheckoutData {
  event_id: string;
  admin_id: string;
  purpose: 'initial_purchase' | 'upgrade' | 'retention_extension';
  to_tier?: 'basic' | 'premium';
  [key: string]: string | undefined;
}

export interface CreateCheckoutArgs {
  variantId: string;
  customerEmail: string;
  customData: CustomCheckoutData;
  successRedirectUrl: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

let initialized = false;
function ensureSetup() {
  if (initialized) return;
  lemonSqueezySetup({ apiKey: requireEnv('LEMONSQUEEZY_API_KEY') });
  initialized = true;
}

export async function createCheckoutUrl(args: CreateCheckoutArgs): Promise<string> {
  ensureSetup();
  const storeId = requireEnv('LEMONSQUEEZY_STORE_ID');

  const { data, error } = await createCheckout(storeId, args.variantId, {
    checkoutData: {
      email: args.customerEmail,
      custom: args.customData,
    },
    productOptions: {
      redirectUrl: args.successRedirectUrl,
    },
    testMode: process.env.LEMONSQUEEZY_TEST_MODE === '1',
  });

  if (error) throw new Error(`LS createCheckout failed: ${error.message}`);
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error('LS createCheckout returned no URL');
  return url;
}

/** Exposed only for tests: resets the module-level init flag. */
export function __resetForTest(): void {
  initialized = false;
}
