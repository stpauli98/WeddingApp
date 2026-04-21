import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { PRICING_TIERS, isValidTier, type PricingTier } from '@/lib/pricing-tiers';
import { isReservedSlug } from '@/lib/security/reserved-slugs';

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
    const { coupleName, location, date, slug, guestMessage, pricingTier } = body;

    if (!coupleName || !location || !date || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof coupleName !== 'string' || coupleName.length < 2 || coupleName.length > 60) {
      return NextResponse.json({ error: "Ime para mora imati između 2 i 60 znakova." }, { status: 400 });
    }
    if (typeof location !== 'string' || location.length < 2 || location.length > 120) {
      return NextResponse.json({ error: "Lokacija mora imati između 2 i 120 znakova." }, { status: 400 });
    }
    if (typeof slug !== 'string' || slug.length < 3 || slug.length > 63) {
      return NextResponse.json({ error: "Slug mora imati između 3 i 63 znaka." }, { status: 400 });
    }
    if (guestMessage != null && (typeof guestMessage !== 'string' || guestMessage.length > 500)) {
      return NextResponse.json({ error: "Poruka za goste može imati najviše 500 znakova." }, { status: 400 });
    }

    if (isReservedSlug(slug)) {
      return NextResponse.json({ error: "Taj URL je rezervisan sistemom. Molimo izaberite drugi." }, { status: 409 });
    }

    const selectedTier: PricingTier = isValidTier(pricingTier) ? pricingTier : 'free';

    // imageLimit is derived server-side from the tier — client input is ignored.
    // Authoritative source: PricingPlan table, with PRICING_TIERS as fallback.
    const planRow = await prisma.pricingPlan.findUnique({
      where: { tier: selectedTier },
      select: { imageLimit: true },
    });
    const resolvedImageLimit = planRow?.imageLimit ?? PRICING_TIERS[selectedTier].imageLimit;

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
        pricingTier: selectedTier,
        imageLimit: resolvedImageLimit,
        admin: { connect: { id: adminId } },
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = Array.isArray(error?.meta?.target) ? error.meta.target : [];
      if (target.includes('adminId')) {
        return NextResponse.json({ error: "Već ste kreirali događaj." }, { status: 409 });
      }
      if (target.includes('slug')) {
        return NextResponse.json({ error: "URL (slug) koji ste odabrali već postoji. Molimo izaberite drugi." }, { status: 409 });
      }
    }
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
