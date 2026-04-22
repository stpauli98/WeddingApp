import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { validateCsrfToken } from "@/lib/csrf";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import cloudinary from "@/lib/cloudinary";

const guestDeleteLimiter = createRateLimiter({
  name: "admin-guest-delete",
  max: 20,
  windowMs: 5 * 60 * 1000,
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      images: true,
      message: true,
      event: { select: { id: true, slug: true, coupleName: true, date: true } },
    },
  });

  if (!guest) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (guest.eventId !== admin.event.id) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 403 });
  }

  return NextResponse.json(guest);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  const ip = getRequestIp(request);
  const rl = await guestDeleteLimiter.check(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Previše zahtjeva za brisanje. Pokušajte ponovo za nekoliko minuta." },
      { status: 429 }
    );
  }

  const csrfToken = request.headers.get("x-csrf-token") || "";
  if (!(await validateCsrfToken(csrfToken))) {
    return NextResponse.json({ error: "Nevažeći CSRF token." }, { status: 403 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { id },
    select: { id: true, eventId: true },
  });
  if (!guest) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (guest.eventId !== admin.event.id) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 403 });
  }

  const images = await prisma.image.findMany({
    where: { guestId: id },
    select: { id: true, storagePath: true },
  });

  await Promise.allSettled(
    images
      .filter((img) => img.storagePath)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            cloudinary.uploader.destroy(img.storagePath!, () => resolve());
          })
      )
  );

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { guestId: id } }),
    prisma.image.deleteMany({ where: { guestId: id } }),
    prisma.guest.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true, deletedImages: images.length });
}
