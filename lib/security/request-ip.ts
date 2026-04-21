export function getRequestIp(req: Request): string {
  const h = req.headers.get('x-forwarded-for');
  return h?.split(',')[0]?.trim() || 'unknown';
}
