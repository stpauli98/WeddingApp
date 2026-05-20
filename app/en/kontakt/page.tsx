import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLdBreadcrumb } from '@/components/seo/JsonLdBreadcrumb';

export const metadata: Metadata = {
  title: 'Contact | AddMemories',
  description: 'AddMemories contact and impressum.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/kontakt',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/kontakt',
      'en-US': 'https://www.dodajuspomenu.com/en/kontakt',
      'x-default': 'https://www.dodajuspomenu.com/sr/kontakt',
    },
  },
};

export default function EnKontaktPage() {
  return (
    <>
      <JsonLdBreadcrumb
        id="breadcrumb-en-kontakt"
        items={[
          { name: 'Home', url: 'https://www.dodajuspomenu.com/en' },
          { name: 'Contact', url: 'https://www.dodajuspomenu.com/en/kontakt' },
        ]}
      />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <article className="prose prose-slate max-w-none">
          <h1>Contact</h1>
          <p>Email: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a></p>
          <p>Operator: Next Pixel s.p., Jovana Dučića 15, 78400 Gradiška, Bosnia and Herzegovina. JIB 4513996760008.</p>
          <p>The full localized contact / impressum page is available in Serbian: <Link href="/sr/kontakt">/sr/kontakt</Link>.</p>
        </article>
      </main>
    </>
  );
}
