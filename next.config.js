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
  // Zaobilazimo TypeScript greške pri build-uu
 /*typescript: {
    ignoreBuildErrors: true,
  },*/
}));
