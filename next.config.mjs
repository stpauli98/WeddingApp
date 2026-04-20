/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 64, 128, 256, 384],
  },
  async headers() {
    // 'unsafe-inline' + 'unsafe-eval' in script-src are pragmatic concessions
    // for Next.js runtime, GA, and Vercel live scripts. Nonce-based strict CSP
    // is a tracked followup. img-src uses broad `https:` because Cloudinary
    // may serve from multiple subdomains.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob: https://res.cloudinary.com https://api.producthunt.com https://www.google-analytics.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com",
      "frame-src 'self' https://www.producthunt.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
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
      {
        source: '/:locale(sr|en)/privacy',
        destination: '/privacy',
      },
      {
        source: '/:locale(sr|en)/terms',
        destination: '/terms',
      },
      {
        source: '/:locale(sr|en)/cookies',
        destination: '/cookies',
      },
      {
        source: '/:locale(sr|en)/kontakt',
        destination: '/kontakt',
      },
    ]
  },
}

export default nextConfig
