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
      customData: { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    });
    expect(url).toBe('https://checkout.lemonsqueezy.com/abc123');
    expect(lemonSqueezySetup).toHaveBeenCalledWith({ apiKey: 'lstest_apikey' });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      checkoutData: expect.objectContaining({
        email: 'admin@example.com',
        custom: { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' },
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
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
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
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
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
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    })).rejects.toThrow(/no URL/);
  });

  it('throws when env var missing', async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    await expect(createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    })).rejects.toThrow(/LEMONSQUEEZY_API_KEY/);
  });

  it('passes localized productOptions.name + description based on locale arg', async () => {
    await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      productOptions: expect.objectContaining({
        name: 'Svadbeni paket — Basic',
        description: expect.stringMatching(/7 slika/),
      }),
    }));
  });

  it('uses EN copy when locale=en', async () => {
    await createCheckoutUrl({
      variantId: 'var_premium',
      customerEmail: 'a@b.c',
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'en',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'premium' },
    });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_premium', expect.objectContaining({
      productOptions: expect.objectContaining({
        name: 'Wedding Package — Premium',
        description: expect.stringMatching(/25 photos/),
      }),
    }));
  });
});
