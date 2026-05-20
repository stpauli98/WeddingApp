// Server component (no 'use client'). Emits a JSON-LD <script> tag whose
// content appears in the INITIAL HTML response — so AI crawlers and the
// first Googlebot pass can extract structured data without executing JS.
//
// Why this exists instead of next/script:
//   next/Script with type="application/ld+json" serializes the payload into
//   the RSC data stream and only injects the <script> element after client
//   hydration. That hides the schema from no-JS crawlers (GPTBot, ClaudeBot,
//   PerplexityBot) and delays Google rich-results extraction by N days.

interface JsonLdProps {
  id: string;
  data: object;
}

export function JsonLd({ id, data }: JsonLdProps) {
  // Escape </script> sequences so a malicious payload string can't break
  // out of the JSON-LD block. Replacement uses the JSON Unicode escape
  // (<), which is valid JSON and harmless when parsed as schema.
  const json = JSON.stringify(data).replace(/</g, '\\u003C');
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
