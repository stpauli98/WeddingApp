import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { images: true, message: true, event: true },
  });
  if (!guest) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(guest);
}
