import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'About – AddMemories',
  description:
    'How AddMemories works — collect wedding photos from every guest via a single QR code.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/about',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/about',
      'en-US': 'https://www.dodajuspomenu.com/en/about',
      'x-default': 'https://www.dodajuspomenu.com/sr/about',
    },
  },
  openGraph: {
    title: 'About – AddMemories',
    description:
      'How AddMemories works — collect wedding photos from every guest via a single QR code.',
    url: 'https://www.dodajuspomenu.com/en/about',
    siteName: 'AddMemories',
    locale: 'en_US',
    type: 'website',
    images: ['/seo-cover.png'],
  },
};

export default function EnAboutPage() {
  const t = getServerT('en');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <section className="max-w-xl w-full bg-white/80 rounded-xl shadow-lg p-8 border border-gray-200">
        <p className="mb-6 text-lg text-gray-700 text-center">{t('about.hookLine')}</p>
        <h1 className="text-3xl font-bold mb-6 text-center text-primary">{t('about.whatIs')}</h1>
        <p className="mb-4 text-lg text-gray-700">{t('about.whatIsBody')}</p>
        <h2 className="text-2xl font-semibold mt-8 mb-3 text-primary">{t('about.howItWorks')}</h2>
        <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
          <li>{t('about.step1')}</li>
          <li>{t('about.step2')}</li>
          <li>{t('about.step3')}</li>
        </ol>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/en/guest/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsGuest')}
          </Link>
          <Link href="/en/admin/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsAdmin')}
          </Link>
        </div>
      </section>
    </main>
  );
}
