import { breadcrumbSchema } from '@/lib/seo/json-ld';

export function JsonLdBreadcrumb({
  id,
  items,
}: {
  id: string;
  items: Array<{ name: string; url: string }>;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // SSR-inlined: avoids next/script post-hydration injection so the JSON-LD
      // is in the initial HTML for crawlers (and for our e2e assertions).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(items)) }}
    />
  );
}
