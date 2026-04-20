/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Static asset rewrites for locale-prefixed URLs.
  // Middleware rewrites `/sr/...` page routes internally, but static assets
  // under /public (images, manifest.json, favicon, etc.) also accidentally
  // inherit the `/sr` prefix from relative URLs on a localized page.
  // These rewrites redirect them back to the canonical root path so the
  // files under /public resolve correctly.
  async rewrites() {
    return [
      {
        source: '/:locale(sr|en)/images/:path*',
        destination: '/images/:path*',
      },
      {
        source: '/:locale(sr|en)/templates/:path*',
        destination: '/templates/:path*',
      },
      {
        source: '/:locale(sr|en)/_next/static/:path*',
        destination: '/_next/static/:path*',
      },
      {
        source: '/:locale(sr|en)/favicon.ico',
        destination: '/favicon.ico',
      },
      {
        source: '/:locale(sr|en)/manifest.json',
        destination: '/manifest.json',
      },
    ]
  },
}

export default nextConfig
