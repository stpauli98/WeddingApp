import crypto from 'crypto';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const apiKey = process.env.LS_API_KEY;
  if (!apiKey) throw new Error('LS_API_KEY not configured');
  lemonSqueezySetup({ apiKey });
  initialized = true;
}

/**
 * Constant-time webhook signature verification.
 * Matches LS docs: HMAC-SHA256(rawBody, LS_WEBHOOK_SECRET) → hex.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(signature, 'hex');
    b = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface CheckoutParams {
  variantId: string;
  customPriceCents: number;
  customData: {
    eventId: string;
    adminId: string;
    targetTier: string;
    checkoutInternalId: string;
  };
  redirectUrl: string;
  customerEmail: string;
}

/**
 * Creates an LS checkout session and returns the hosted URL.
 * Uses custom_price to bill the differential upgrade amount.
 */
export async function createCheckoutUrl(params: CheckoutParams): Promise<string> {
  ensureInitialized();
  const storeId = process.env.LS_STORE_ID;
  if (!storeId) throw new Error('LS_STORE_ID not configured');

  const { data, error } = await createCheckout(storeId, params.variantId, {
    checkoutData: {
      email: params.customerEmail,
      custom: params.customData as unknown as Record<string, string>,
    },
    productOptions: {
      redirectUrl: params.redirectUrl,
      receiptButtonText: 'Povratak u aplikaciju',
    },
    checkoutOptions: {
      embed: false,
    },
    customPrice: params.customPriceCents,
  });

  if (error) {
    throw new Error(`LS createCheckout failed: ${error.message}`);
  }
  if (!data?.data?.attributes?.url) {
    throw new Error('LS createCheckout returned no URL');
  }
  return data.data.attributes.url;
}
