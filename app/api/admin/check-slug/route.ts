import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getRequestIp } from "@/lib/security/request-ip";
import { createRateLimiter } from "@/lib/security/rate-limit";

const checkSlugLimiter = createRateLimiter({ name: 'check-slug', max: 10, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getRequestIp(request);
  const rl = await checkSlugLimiter.check(ip);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || slug.length < 3) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  try {
    const existingEvent = await prisma.event.findUnique({ where: { slug } });
    return NextResponse.json({
      available: !existingEvent,
      reason: existingEvent ? "exists" : "available",
    });
  } catch (error) {
    console.error("Error checking slug:", error);
    return NextResponse.json({ available: false, reason: "error" }, { status: 500 });
  }
}
