import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | AddMemories',
  description: 'AddMemories privacy policy.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/privacy',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/privacy',
      'en-US': 'https://www.dodajuspomenu.com/en/privacy',
      'x-default': 'https://www.dodajuspomenu.com/sr/privacy',
    },
  },
};

export default function EnPrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Privacy Policy</h1>
        <p>
          The English translation of our privacy policy is in progress. In the meantime, please refer to the authoritative Serbian version:{' '}
          <Link href="/sr/privacy">/sr/privacy</Link>.
        </p>
        <p>For privacy requests, contact <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>
      </article>
    </main>
  );
}
