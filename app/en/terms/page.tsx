import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | AddMemories',
  description: 'AddMemories terms of service.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/terms',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/terms',
      'en-US': 'https://www.dodajuspomenu.com/en/terms',
      'x-default': 'https://www.dodajuspomenu.com/sr/terms',
    },
  },
};

export default function EnTermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Terms of Service</h1>
        <p>
          The English translation of our terms of service is in progress. In the meantime, please refer to the authoritative Serbian version:{' '}
          <Link href="/sr/terms">/sr/terms</Link>.
        </p>
        <p>For privacy requests, contact <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>
      </article>
    </main>
  );
}
