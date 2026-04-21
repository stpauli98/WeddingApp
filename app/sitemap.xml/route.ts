import { NextResponse } from "next/server";

export async function GET() {
  const base = "https://www.dodajuspomenu.com";
  const lastmod = new Date().toISOString();

  type Url = {
    loc: string;
    priority?: string;
    alternates?: Record<string, string>;
  };

  const urls: Url[] = [
    {
      loc: `${base}/sr`,
      priority: "1.0",
      alternates: {
        "sr-RS": `${base}/sr`,
        "en-US": `${base}/en`,
        "x-default": `${base}/sr`,
      },
    },
    {
      loc: `${base}/en`,
      priority: "1.0",
      alternates: {
        "sr-RS": `${base}/sr`,
        "en-US": `${base}/en`,
        "x-default": `${base}/sr`,
      },
    },
    { loc: `${base}/privacy`, priority: "0.5" },
    { loc: `${base}/terms`, priority: "0.5" },
    { loc: `${base}/cookies`, priority: "0.5" },
    { loc: `${base}/kontakt`, priority: "0.6" },
  ];

  const body = urls
    .map((u) => {
      const alt = u.alternates
        ? "\n    " +
          Object.entries(u.alternates)
            .map(
              ([lang, href]) =>
                `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`
            )
            .join("\n    ")
        : "";
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : "";
      return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>${priority}${alt}
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
