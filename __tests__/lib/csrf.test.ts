/** @jest-environment node */
import { generateCsrfToken } from '@/lib/csrf';

describe('generateCsrfToken', () => {
  const origEnv = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as any).NODE_ENV = origEnv;
  });

  it('includes Secure flag in production', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.CSRF_SECRET = Buffer.from(new Uint8Array(32)).toString('base64');
    const { cookie } = await generateCsrfToken();
    expect(cookie).toMatch(/;\s*Secure/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('omits Secure flag in development', async () => {
    (process.env as any).NODE_ENV = 'development';
    const { cookie } = await generateCsrfToken();
    expect(cookie).not.toMatch(/Secure/i);
  });
});
