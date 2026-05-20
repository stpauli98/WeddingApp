import { NextResponse } from 'next/server';

export async function GET() {
  const base = 'https://www.dodajuspomenu.com';
  // Stable lastmod: pinned to the most recent content-affecting deploy.
  // Bump manually when sitemap-affecting content changes; Google treats
  // a constantly-fresh lastmod as untrustworthy.
  const lastmod = '2026-05-20T00:00:00.000Z';

  type Url = {
    loc: string;
    priority?: string;
    alternates?: Record<string, string>;
    images?: Array<{ loc: string; title?: string }>;
  };

  const pages: Array<{ path: string; priority?: string }> = [
    { path: '',         priority: '1.0' },
    { path: '/about',   priority: '0.7' },
    { path: '/privacy', priority: '0.4' },
    { path: '/terms',   priority: '0.4' },
    { path: '/cookies', priority: '0.4' },
    { path: '/kontakt', priority: '0.6' },
  ];

  const urls: Url[] = pages.flatMap(p => {
    const altSr = `${base}/sr${p.path}`;
    const altEn = `${base}/en${p.path}`;
    const alternates = {
      'sr-RS': altSr,
      'en-US': altEn,
      'x-default': altSr,
    };
    return [
      { loc: altSr, priority: p.priority, alternates },
      { loc: altEn, priority: p.priority, alternates },
    ];
  });

  // Landing-page image entries (Google Images surface).
  // urls[0] = /sr (SR landing), urls[1] = /en (EN landing).
  urls[0].images = [
    { loc: `${base}/seo-cover.png`, title: 'DodajUspomenu — Digitalni svadbeni album' },
  ];
  urls[1].images = [
    { loc: `${base}/seo-cover.png`, title: 'AddMemories — Digital Wedding Album' },
  ];

  const body = urls
    .map(u => {
      const alt = u.alternates
        ? '\n    ' +
          Object.entries(u.alternates)
            .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`)
            .join('\n    ')
        : '';
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : '';
      const images = u.images
        ? '\n    ' +
          u.images
            .map(
              i =>
                `<image:image><image:loc>${i.loc}</image:loc>${i.title ? `<image:title>${escapeXml(i.title)}</image:title>` : ''}</image:image>`
            )
            .join('\n    ')
        : '';
      return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>${priority}${alt}${images}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(s: string): string {
  const repl: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
  return s.replace(/[<>&"']/g, c => repl[c]!);
}
