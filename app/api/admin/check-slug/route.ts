import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getRequestIp } from "@/lib/security/request-ip";

declare global { var __checkSlugAttempts: Map<string, number[]> | undefined; }
const attempts: Map<string, number[]> = globalThis.__checkSlugAttempts || new Map();
globalThis.__checkSlugAttempts = attempts;
const MAX = 10;
const WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getRequestIp(request);
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(ts => now - ts < WINDOW_MS);
  if (recent.length >= MAX) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  attempts.set(ip, [...recent, now]);

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
