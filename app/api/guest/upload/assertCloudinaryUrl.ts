const REQUIRED_PREFIX = 'https://res.cloudinary.com/';

/**
 * Defence-in-depth guard: Cloudinary is the only persisted image host.
 * Throws if the URL is not a legitimate Cloudinary secure_url.
 * The check is exact-prefix: `res.cloudinary.com.attacker.com/...` fails
 * because the next char after the required prefix must be a path segment.
 */
export function assertCloudinaryUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('Upload returned an empty URL.');
  }
  if (!url.startsWith(REQUIRED_PREFIX)) {
    throw new Error(
      `Upload returned a non-Cloudinary URL (${url.slice(0, 60)}…); refusing to persist.`
    );
  }
}
