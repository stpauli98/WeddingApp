import type { TFunction } from 'i18next';

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
        url: `${SITE}/kontakt`,
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
