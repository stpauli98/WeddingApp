import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { validateCsrfToken } from "@/lib/csrf";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import cloudinary from "@/lib/cloudinary";

const bulkDeleteLimiter = createRateLimiter({
  name: "admin-image-bulk-delete",
  max: 20,
  windowMs: 5 * 60 * 1000,
});

// Max number of images deletable in one call. Prevents a single request
// from tying up the Cloudinary fanout indefinitely.
const MAX_BULK = 200;

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  const ip = getRequestIp(request);
  const rl = await bulkDeleteLimiter.check(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Previše zahtjeva. Pokušajte ponovo za nekoliko minuta." },
      { status: 429 }
    );
  }

  const csrfToken = request.headers.get("x-csrf-token") || "";
  if (!(await validateCsrfToken(csrfToken))) {
    return NextResponse.json({ error: "Nevažeći CSRF token." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "INVALID_IDS" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Najviše ${MAX_BULK} slika po zahtjevu.` },
      { status: 400 }
    );
  }

  // Find all images + their guest's eventId in one query.
  const images = await prisma.image.findMany({
    where: { id: { in: ids as string[] } },
    include: { guest: { select: { eventId: true } } },
  });

  // Ownership check: every image must belong to this admin's event.
  // Any mismatch → 403 for the whole request (no partial delete).
  const foreign = images.filter((img) => img.guest.eventId !== admin.event!.id);
  if (foreign.length > 0) {
    return NextResponse.json(
      { error: "Nemate pristup nekim slikama", foreignIds: foreign.map((i) => i.id) },
      { status: 403 }
    );
  }

  // Best-effort Cloudinary destroy in parallel. Failures logged, DB delete still proceeds.
  const cloudinaryResults = await Promise.allSettled(
    images
      .filter((img) => img.storagePath)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            cloudinary.uploader.destroy(img.storagePath!, () => resolve());
          })
      )
  );
  const cloudinaryFailed = cloudinaryResults.filter((r) => r.status === "rejected").length;
  if (cloudinaryFailed > 0) {
    console.error(
      `[admin-image-bulk-delete] ${cloudinaryFailed}/${images.length} Cloudinary destroys failed`
    );
  }

  // DB delete. If a request-supplied id didn't exist in the DB it's silently skipped.
  const deleted = await prisma.image.deleteMany({
    where: { id: { in: images.map((img) => img.id) } },
  });

  return NextResponse.json({
    success: true,
    deletedCount: deleted.count,
    requested: ids.length,
  });
}
