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
  // Zaobilazimo TypeScript greške pri build-uu
 /* typescript: {
    ignoreBuildErrors: true,
  },*/
});
