import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLdBreadcrumb } from '@/components/seo/JsonLdBreadcrumb';

export const metadata: Metadata = {
  title: 'Cookie Policy | AddMemories',
  description: 'AddMemories cookie policy.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/cookies',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/cookies',
      'en-US': 'https://www.dodajuspomenu.com/en/cookies',
      'x-default': 'https://www.dodajuspomenu.com/sr/cookies',
    },
  },
};

export default function EnCookiesPage() {
  return (
    <>
      <JsonLdBreadcrumb
        id="breadcrumb-en-cookies"
        items={[
          { name: 'Home', url: 'https://www.dodajuspomenu.com/en' },
          { name: 'Cookie Policy', url: 'https://www.dodajuspomenu.com/en/cookies' },
        ]}
      />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="prose prose-slate max-w-none">
          <h1>Cookie Policy</h1>
          <p>
            The English translation of our cookie policy is in progress. In the meantime, please refer to the authoritative Serbian version:{' '}
            <Link href="/sr/cookies">/sr/cookies</Link>.
          </p>
          <p>For privacy requests, contact <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>
        </article>
      </main>
    </>
  );
}
