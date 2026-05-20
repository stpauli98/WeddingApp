/**
 * @jest-environment node
 *
 * SSR-only test: renderToString needs TextEncoder which is missing in the
 * project's default jsdom env. Node env has TextEncoder natively and is
 * the correct environment for asserting against initial server-rendered HTML.
 */
import { describe, it, expect } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { JsonLd } from '@/components/seo/JsonLd';

describe('<JsonLd>', () => {
  it('renders a <script type="application/ld+json"> with the given id', () => {
    const html = renderToString(
      <JsonLd id="jsonld-test" data={{ '@context': 'https://schema.org', '@type': 'Thing', name: 'X' }} />
    );
    expect(html).toContain('<script');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('id="jsonld-test"');
  });

  it('serializes the schema as JSON inside the script body', () => {
    const html = renderToString(
      <JsonLd id="jsonld-foo" data={{ '@type': 'Person', name: 'Ada' }} />
    );
    // The JSON must appear in initial markup (not as a child of __next_f.push)
    expect(html).toMatch(/<script[^>]*id="jsonld-foo"[^>]*>\{"@type":"Person","name":"Ada"\}<\/script>/);
  });

  it('escapes </script> inside the payload to prevent injection', () => {
    const html = renderToString(
      <JsonLd id="jsonld-xss" data={{ '@type': 'Hack', payload: '</script><img src=x>' }} />
    );
    // The < of </script> must be escaped (<) so the closing tag cannot
    // terminate the JSON-LD block early. Schema.org JSON-LD recommendation.
    expect(html).not.toContain('</script><img');
    expect(html).toMatch(/\\u003[Cc]\/script/);
  });
});
