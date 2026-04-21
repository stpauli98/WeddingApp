import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getRequestIp } from '@/lib/security/request-ip';
import { normalizeEmail } from '@/lib/security/email';
import { generateSessionToken } from '@/lib/security/session-token';
import { createRateLimiter } from '@/lib/security/rate-limit';

// Constant bcrypt hash used to equalize timing when admin is not found.
// Valid $2a$10 hash — never matches any real password. Any valid bcrypt hash works here.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8VRgpoSr1PG5bI3lHvlZYZFJyrCHVS';

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set('set-cookie', cookie);
  return response;
}

const loginLimiter = createRateLimiter({ name: 'admin-login', max: 5, windowMs: 15 * 60 * 1000 });

export async function POST(req: NextRequest) {
  const csrfToken = req.headers.get('x-csrf-token') || req.cookies.get('csrf_token')?.value || '';
  if (!(await validateCsrfToken(csrfToken))) {
    return NextResponse.json({ error: 'Nevažeći CSRF token.' }, { status: 403 });
  }

  const ip = getRequestIp(req);
  const rl = await loginLimiter.check(ip);
  if (!rl.success) {
    return NextResponse.json({ error: 'Previše neuspešnih pokušaja. Pokušajte ponovo za 15 minuta.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    // Always run bcrypt.compare to equalize timing between user-not-found and wrong-password.
    const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

    if (!admin || !valid) {
      return NextResponse.json({ error: 'Neispravan email ili lozinka.' }, { status: 401 });
    }

    await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await prisma.adminSession.create({ data: { adminId: admin.id, sessionToken, expiresAt } });

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
