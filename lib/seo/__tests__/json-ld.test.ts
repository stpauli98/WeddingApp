import { describe, it, expect } from '@jest/globals';
import {
  websiteSchema,
  organizationSchema,
  faqPageSchema,
  productSchema,
  localBusinessSchema,
  softwareApplicationSchema,
  breadcrumbSchema,
} from '@/lib/seo/json-ld';

// Lightweight TFunction stub — returns the key path so we can assert structure.
const stubT = ((key: string) => `<<${key}>>`) as unknown as import('i18next').TFunction;

describe('websiteSchema', () => {
  it('returns Serbian fields for sr', () => {
    const s = websiteSchema('sr');
    expect(s['@type']).toBe('WebSite');
    expect(s.name).toBe('DodajUspomenu');
    expect(s.inLanguage).toBe('sr-RS');
    expect(s.url).toBe('https://www.dodajuspomenu.com/sr');
    expect(s.description).toMatch(/Digitalni svadbeni album/);
  });

  it('returns English fields for en', () => {
    const s = websiteSchema('en');
    expect(s.name).toBe('AddMemories');
    expect(s.inLanguage).toBe('en-US');
    expect(s.url).toBe('https://www.dodajuspomenu.com/en');
    expect(s.description).toMatch(/Digital wedding album/);
  });
});

describe('organizationSchema', () => {
  it('exposes the correct @type and ContactPoint', () => {
    const s = organizationSchema();
    expect(s['@type']).toBe('Organization');
    expect(s.contactPoint[0].email).toBe('kontakt@dodajuspomenu.com');
    expect(Array.isArray(s.sameAs)).toBe(true);
    expect(s.sameAs.length).toBeGreaterThan(0);
  });
});

describe('faqPageSchema', () => {
  it('produces 8 questions wired to the translation keys', () => {
    const s = faqPageSchema(stubT);
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity).toHaveLength(8);
    expect(s.mainEntity[0].name).toBe('<<faq.question1>>');
    expect(s.mainEntity[0].acceptedAnswer.text).toBe('<<faq.answer1>>');
    expect(s.mainEntity[7].name).toBe('<<faq.question8>>');
  });
});

describe('productSchema', () => {
  const fakePlans = [
    { tier: 'free',    price: 0,    name: { sr: 'Besplatno', en: 'Free' },    recommended: false, imageLimit: 3,  guestLimit: 20,  storageDays: 30 },
    { tier: 'basic',   price: 2500, name: { sr: 'Osnovni',  en: 'Basic' },   recommended: false, imageLimit: 7,  guestLimit: 100, storageDays: 30 },
    { tier: 'premium', price: 7500, name: { sr: 'Premium',  en: 'Premium' }, recommended: true,  imageLimit: 25, guestLimit: 300, storageDays: 30 },
  ] as any;

  it('emits three Offer entries with correct euro pricing', () => {
    const s = productSchema(fakePlans, 'sr');
    expect(s['@type']).toBe('Product');
    expect(s.offers).toHaveLength(3);
    expect(s.offers[0].price).toBe('0.00');
    expect(s.offers[1].price).toBe('25.00');
    expect(s.offers[2].price).toBe('75.00');
    expect(s.offers[2].priceCurrency).toBe('EUR');
  });

  it('uses locale-specific plan name + URL', () => {
    const sr = productSchema(fakePlans, 'sr');
    const en = productSchema(fakePlans, 'en');
    expect(sr.offers[0].name).toBe('Besplatno');
    expect(en.offers[0].name).toBe('Free');
    expect(sr.offers[0].url).toMatch(/\/sr\/admin\/register\?tier=free$/);
    expect(en.offers[0].url).toMatch(/\/en\/admin\/register\?tier=free$/);
  });
});

describe('localBusinessSchema', () => {
  it('has the registered BiH address + JIB', () => {
    const s = localBusinessSchema();
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.address.addressCountry).toBe('BA');
    expect(s.address.postalCode).toBe('78400');
    expect(s.taxID).toBe('4513996760008');
  });
});

describe('softwareApplicationSchema', () => {
  it('reports the lowest tier price as Offer price', () => {
    const s = softwareApplicationSchema('en', [
      { price: 7500, tier: 'premium' },
      { price: 0, tier: 'free' },
      { price: 2500, tier: 'basic' },
    ]);
    expect(s.offers.price).toBe('0.00');
    expect(s.applicationCategory).toBe('MultimediaApplication');
  });
});

describe('breadcrumbSchema', () => {
  it('positions items 1..N', () => {
    const s = breadcrumbSchema([
      { name: 'Home', url: 'https://example.com/' },
      { name: 'About', url: 'https://example.com/about' },
    ]);
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].position).toBe(2);
    expect(s.itemListElement[1].name).toBe('About');
    expect(s.itemListElement[1].item).toBe('https://example.com/about');
  });
});
