import { NextResponse } from "next/server";

export async function GET() {
  // Ručno navedi glavne rute, možeš proširiti po potrebi
  const baseUrl = "https://mojasvadbaa.com";
  const urls = ["", "/verify", "/dashboard", "/success"];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      (path) => `<url><loc>${baseUrl}${path}</loc></url>`
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
