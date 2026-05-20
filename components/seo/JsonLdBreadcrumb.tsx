import { breadcrumbSchema } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';

export function JsonLdBreadcrumb({
  id,
  items,
}: {
  id: string;
  items: Array<{ name: string; url: string }>;
}) {
  return <JsonLd id={id} data={breadcrumbSchema(items)} />;
}
