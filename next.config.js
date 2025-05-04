const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  images: {
    domains: [
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      'res.cloudinary.com',
    ],
  },
  // Ovdje možeš dodati dodatne Next.js konfiguracije po potrebi
});
