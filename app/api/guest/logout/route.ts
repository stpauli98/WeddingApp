import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCsrfToken, validateCsrfToken } from "@/lib/csrf";

// GET — izdaje CSRF token za logout (isti pattern kao admin login)
export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set('set-cookie', cookie);
  return response;
}

export async function POST(req: NextRequest) {
  // CSRF zaštita — state-mutating endpoint
  const csrfToken = req.headers.get('x-csrf-token') || req.cookies.get('csrf_token')?.value || '';
  const validCsrf = await validateCsrfToken(csrfToken);
  if (!validCsrf) {
    return NextResponse.json({ error: 'Nevažeći CSRF token.' }, { status: 403 });
  }

  try {
    const sessionToken = req.cookies.get('guest_session')?.value;

    // Invalidate session u bazi — sprečava reuse leakovanog cookie-ja
    if (sessionToken) {
      await prisma.guest.updateMany({
        where: { sessionToken },
        data: { sessionToken: null, sessionExpires: null },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("guest_session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (e) {
    console.error('Guest logout error:', e);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
