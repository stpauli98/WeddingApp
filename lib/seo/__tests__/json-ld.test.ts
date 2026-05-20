import { describe, it, expect } from '@jest/globals';
import { websiteSchema, organizationSchema, faqPageSchema } from '@/lib/seo/json-ld';

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
