import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { validateCsrfToken } from "@/lib/csrf";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import cloudinary from "@/lib/cloudinary";

const deleteLimiter = createRateLimiter({
  name: "admin-image-delete",
  max: 60,
  windowMs: 5 * 60 * 1000,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  const ip = getRequestIp(request);
  const rl = await deleteLimiter.check(ip);
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

  const image = await prisma.image.findUnique({
    where: { id },
    include: { guest: { select: { eventId: true } } },
  });

  if (!image) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Ownership: the image's guest must belong to this admin's event.
  if (image.guest.eventId !== admin.event.id) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 403 });
  }

  // Best-effort Cloudinary delete. If it fails the DB delete still proceeds —
  // the asset will sit in Cloudinary but no longer be referenced.
  if (image.storagePath) {
    try {
      await new Promise<void>((resolve) => {
        cloudinary.uploader.destroy(image.storagePath!, () => resolve());
      });
    } catch (err) {
      console.error("[admin-image-delete] cloudinary destroy failed", err);
    }
  }

  await prisma.image.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
