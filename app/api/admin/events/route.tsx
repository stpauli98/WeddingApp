import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';

export async function GET() {
  const { token } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set("csrf_token_admin_events", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30,
    path: "/"
  });
  return response;
}

export async function POST(request: Request) {
  // CSRF zaštita
  const csrfToken = request.headers.get('x-csrf-token') || '';
  const validCsrf = await validateCsrfToken(csrfToken);
  if (!validCsrf) {
    return NextResponse.json({ error: "Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { coupleName, location, date, slug, guestMessage, pricingTier, imageLimit } = body;

    if (!coupleName || !location || !date || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (imageLimit !== undefined) {
      const limit = parseInt(imageLimit);
      if (isNaN(limit) || limit < 10 || limit > 999) {
        return NextResponse.json({ error: "Image limit must be between 10 and 999" }, { status: 400 });
      }
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Niste prijavljeni kao admin." }, { status: 401 });
    }
    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      include: { admin: true },
    });
    if (!session || !session.admin) {
      return NextResponse.json({ error: "Nevažeća admin sesija." }, { status: 401 });
    }
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Sesija je istekla. Prijavite se ponovo." }, { status: 401 });
    }
    const adminId = session.admin.id;

    const existingEvent = await prisma.event.findFirst({ where: { adminId } });
    if (existingEvent) {
      return NextResponse.json({ error: "Već ste kreirali događaj." }, { status: 409 });
    }

    const existingSlug = await prisma.event.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "URL (slug) koji ste odabrali već postoji. Molimo izaberite drugi." }, { status: 409 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { language: true }
    });

    const event = await prisma.event.create({
      data: {
        coupleName,
        location,
        date: new Date(date),
        slug,
        guestMessage: guestMessage || null,
        language: admin?.language || "sr",
        pricingTier: pricingTier || "free",
        imageLimit: imageLimit ? parseInt(imageLimit) : 10,
        admin: { connect: { id: adminId } },
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
