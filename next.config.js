const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: '/service-worker.js',
  fallbacks: {
    document: '/offline.html',
  },
});

module.exports = withBundleAnalyzer(withPWA({
  images: {
    unoptimized: true, // Rješava problem s optimizacijom slika
    domains: ['localhost', 'www.dodajuspomenu.com'], // Dodajemo domene za lokalni razvoj i produkciju
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // Osiguravamo da statički resursi budu dostupni u svim jezičnim rutama
  async rewrites() {
    return [
      // Preusmjeravanje za slike
      {
        source: '/:locale/images/:path*',
        destination: '/images/:path*',
      },
      // Preusmjeravanje za sve ostale statičke resurse
      {
        source: '/:locale/_next/static/:path*',
        destination: '/_next/static/:path*',
      },
      {
        source: '/:locale/favicon.ico',
        destination: '/favicon.ico',
      },
      {
        source: '/:locale/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
  // Zaobilazimo TypeScript greške pri build-uu
 /*typescript: {
    ignoreBuildErrors: true,
  },*/
}));
