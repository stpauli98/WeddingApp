import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://www.dodajuspomenu.com";

  const urls = [
    // Landing pages
    { path: "", priority: "1.0", changefreq: "weekly" },
    { path: "/sr", priority: "1.0", changefreq: "weekly" },
    { path: "/en", priority: "1.0", changefreq: "weekly" },

    // About
    { path: "/about", priority: "0.8", changefreq: "monthly" },

    // Admin pages
    { path: "/admin/register", priority: "0.7", changefreq: "monthly" },
    { path: "/admin/login", priority: "0.7", changefreq: "monthly" },
    { path: "/admin/dashboard", priority: "0.6", changefreq: "weekly" },

    // Guest pages
    { path: "/guest/login", priority: "0.7", changefreq: "monthly" },
    { path: "/guest/dashboard", priority: "0.6", changefreq: "weekly" },
    { path: "/guest/success", priority: "0.5", changefreq: "monthly" },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urls
    .map(
      ({ path, priority, changefreq }) => `<url>
    <loc>${baseUrl}${path}</loc>
    <priority>${priority}</priority>
    <changefreq>${changefreq}</changefreq>
  </url>`
    )
    .join("\n  ")}
</urlset>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
