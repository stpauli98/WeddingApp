import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !admin.event) {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 401 });
  }

  try {
    const images = await prisma.image.findMany({
      where: { guest: { eventId: admin.event.id } },
      select: { id: true, imageUrl: true },
    });

    if (!images.length) {
      return new NextResponse("Nema slika za preuzimanje", { status: 404 });
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const img of images) {
      if (img.imageUrl.startsWith("data:")) {
        const base64 = img.imageUrl.split(",")[1];
        zip.file(`slika_${img.id}.jpg`, base64, { base64: true });
      } else {
        try {
          const res = await fetch(img.imageUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const ext = img.imageUrl.includes(".png") ? "png" : "jpg";
            zip.file(`slika_${img.id}.${ext}`, buffer);
          }
        } catch {}
      }
    }

    const content = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(content as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=slike.zip`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Greška pri generisanju ZIP-a" }, { status: 500 });
  }
}
