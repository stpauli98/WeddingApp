import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || slug.length < 3) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  // Check if slug matches the pattern
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { slug },
    });

    return NextResponse.json({
      available: !existingEvent,
      reason: existingEvent ? "exists" : "available",
    });
  } catch (error) {
    console.error("Error checking slug:", error);
    return NextResponse.json({ available: false, reason: "error" }, { status: 500 });
  }
}
