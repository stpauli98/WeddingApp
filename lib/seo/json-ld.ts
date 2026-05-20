import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';

export type Locale = 'sr' | 'en';

const SITE = 'https://www.dodajuspomenu.com';

export function websiteSchema(locale: Locale) {
  const desc =
    locale === 'sr'
      ? 'Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmjena fotografija sa vjenčanja.'
      : 'Digital wedding album — guests upload photos and well-wishes, newlyweds download the memories. Fast, private wedding photo sharing.';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    url: `${SITE}/${locale}`,
    description: desc,
    inLanguage: locale === 'sr' ? 'sr-RS' : 'en-US',
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DodajUspomenu',
    alternateName: 'AddMemories',
    url: `${SITE}/`,
    logo: `${SITE}/seo-cover.png`,
    sameAs: [
      'https://www.facebook.com/dodajuspomenu',
      'https://www.instagram.com/dodajuspomenu',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'kontakt@dodajuspomenu.com',
        contactType: 'customer support',
        url: `${SITE}/sr/kontakt`,
        availableLanguage: ['sr', 'en'],
      },
    ],
  };
}

export function faqPageSchema(t: TFunction) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
    '@type': 'Question',
    name: t(`faq.question${n}`),
    acceptedAnswer: { '@type': 'Answer', text: t(`faq.answer${n}`) },
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items,
  };
}

export function productSchema(plans: PricingPlanRow[], locale: Locale) {
  const lang = locale === 'sr' ? 'sr' : 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    description:
      locale === 'sr'
        ? 'Digitalni svadbeni album za prikupljanje fotografija gostiju putem QR koda.'
        : 'Digital wedding album for collecting guest photos via QR code.',
    image: `${SITE}/seo-cover.png`,
    brand: { '@type': 'Brand', name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories' },
    offers: plans.map(p => ({
      '@type': 'Offer',
      name: p.name[lang],
      price: (p.price / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/${locale}/admin/register?tier=${p.tier}`,
    })),
  };
}

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE}/#localbusiness`,
    name: 'Next Pixel s.p.',
    alternateName: 'DodajUspomenu',
    url: SITE,
    email: 'kontakt@dodajuspomenu.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jovana Dučića 15',
      addressLocality: 'Gradiška',
      postalCode: '78400',
      addressCountry: 'BA',
    },
    taxID: '4513996760008',
    sameAs: ['https://www.nextpixel.dev/'],
  };
}

export function softwareApplicationSchema(
  locale: Locale,
  plans: { price: number; tier: string }[]
) {
  const lowestEur = (Math.min(...plans.map(p => p.price)) / 100).toFixed(2);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    operatingSystem: 'Web',
    applicationCategory: 'MultimediaApplication',
    url: `${SITE}/${locale}`,
    offers: {
      '@type': 'Offer',
      price: lowestEur,
      priceCurrency: 'EUR',
    },
    description:
      locale === 'sr'
        ? 'Web aplikacija za prikupljanje fotografija sa vjenčanja preko QR koda.'
        : 'Web app for collecting wedding photos from guests via a QR code.',
  };
}
