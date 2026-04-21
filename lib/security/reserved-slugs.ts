export const RESERVED_SLUGS = [
  'admin', 'api', '_next', 'static', 'public',
  'login', 'register', 'dashboard', 'logout',
  'images', 'templates', 'videos', 'slider_pictures', 'fonts',
  'favicon', 'favicon.ico', 'robots', 'robots.txt', 'sitemap', 'sitemap.xml',
  'manifest', 'manifest.json', '.well-known',
  'kontakt', 'privacy', 'terms', 'cookies', 'unsubscribe', 'feedback',
  'guest', 'sr', 'en',
] as const;

const RESERVED_SET = new Set(RESERVED_SLUGS.map(s => s.toLowerCase()));

export function isReservedSlug(raw: unknown): boolean {
  if (typeof raw !== 'string') return true;
  const slug = raw.trim().toLowerCase();
  if (slug === '') return true;
  return RESERVED_SET.has(slug);
}
