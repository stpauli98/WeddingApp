jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  createCheckout: jest.fn(async () => ({
    data: { data: { attributes: { url: 'https://checkout.lemonsqueezy.com/abc123' } } },
    error: null,
  })),
}));

import { createCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { createCheckoutUrl, __resetForTest } from '@/lib/lemonsqueezy/client';

describe('createCheckoutUrl', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTest();
    process.env = {
      ...originalEnv,
      LEMONSQUEEZY_API_KEY: 'lstest_apikey',
      LEMONSQUEEZY_STORE_ID: '99',
      LEMONSQUEEZY_TEST_MODE: '1',
    };
  });
  afterEach(() => { process.env = originalEnv; });

  it('returns checkout URL on success', async () => {
    const url = await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'admin@example.com',
      customData: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
    });
    expect(url).toBe('https://checkout.lemonsqueezy.com/abc123');
    expect(lemonSqueezySetup).toHaveBeenCalledWith({ apiKey: 'lstest_apikey' });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      checkoutData: expect.objectContaining({
        email: 'admin@example.com',
        custom: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' },
      }),
      productOptions: expect.objectContaining({
        redirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
      }),
      testMode: true,
    }));
  });

  it('passes testMode: false when LEMONSQUEEZY_TEST_MODE is not "1"', async () => {
    process.env.LEMONSQUEEZY_TEST_MODE = '0';
    await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      testMode: false,
    }));
  });

  it('throws when LS SDK returns error', async () => {
    (createCheckout as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid variant' },
    });
    await expect(createCheckoutUrl({
      variantId: 'var_bad',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    })).rejects.toThrow(/invalid variant/);
  });

  it('throws when SDK returns success but no URL', async () => {
    (createCheckout as jest.Mock).mockResolvedValueOnce({
      data: { data: { attributes: {} } },
      error: null,
    });
    await expect(createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    })).rejects.toThrow(/no URL/);
  });

  it('throws when env var missing', async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    await expect(createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    })).rejects.toThrow(/LEMONSQUEEZY_API_KEY/);
  });
});
