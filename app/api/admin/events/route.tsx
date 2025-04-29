import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken });
  response.cookies.set("csrf_token_admin_events", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minuta
    path: "/"
  });
  return response;
}


export async function POST(request: Request) {
  // CSRF zaštita
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get("csrf_token_admin_events")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: "Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { coupleName, location, date, slug, guestMessage } = body;

    if (!coupleName || !location || !date || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Pronađi admina preko session cookie-ja
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
    const adminId = session.admin.id;

    // 2. Proveri da li admin već ima event
    const existingEvent = await prisma.event.findFirst({ where: { adminId } });
    if (existingEvent) {
      return NextResponse.json({ error: "Već ste kreirali događaj." }, { status: 409 });
    }

    // 3. Proveri da li slug već postoji
    const existingSlug = await prisma.event.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "URL (slug) koji ste odabrali već postoji. Molimo izaberite drugi." }, { status: 409 });
    }

    // 4. Kreiraj event sa adminId
    const event = await prisma.event.create({
      data: {
        coupleName,
        location,
        date: new Date(date),
        slug,
        guestMessage: guestMessage || null,
        admin: { connect: { id: adminId } },
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
