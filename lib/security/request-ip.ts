/**
 * Resolve client IP from request headers.
 *
 * Prefers x-real-ip (set by Vercel's edge proxy — NOT forwardable by clients).
 * Falls back to x-forwarded-for ONLY if x-real-ip is absent (e.g., local dev).
 * Returns 'unknown' if neither header is set.
 *
 * Rationale: x-forwarded-for is trivially spoofable (clients can supply it),
 * breaking per-IP rate limiting. x-real-ip is added by Vercel after stripping
 * client-supplied versions, so it's trustworthy in production.
 */
export function getRequestIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.length > 0) {
    return realIp.trim();
  }
  // Fallback for local dev / non-Vercel deploys
  const xff = req.headers.get('x-forwarded-for');
  if (xff && xff.length > 0) {
    return xff.split(',')[0]?.trim() || 'unknown';
  }
  return 'unknown';
}
