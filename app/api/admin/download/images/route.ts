import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pronađi sve slike iz baze
    const images = await prisma.image.findMany({
      select: { id: true, imageUrl: true },
    });
    if (!images.length) {
      return new NextResponse("Nema slika za preuzimanje", { status: 404 });
    }
    // Pripremi ZIP
    const zip = new JSZip();
    images.forEach((img, idx) => {
      if (img.imageUrl.startsWith("data:")) {
        const base64 = img.imageUrl.split(",")[1];
        zip.file(`slika_${img.id || idx}.jpg`, base64, { base64: true });
      }
    });
    const content = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(content, {
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
