/** Insert a Cloudinary transformation segment into a delivery URL (right after `/upload/`).
 *  Returns the URL unchanged when there is no `/upload/` marker (e.g. data: URIs). */
export function withCloudinaryTransform(url: string, transform: string): string {
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const insertAt = i + marker.length;
  return url.slice(0, insertAt) + transform + '/' + url.slice(insertAt);
}
