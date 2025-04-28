import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: Request) {
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

    // 3. Kreiraj event sa adminId
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
