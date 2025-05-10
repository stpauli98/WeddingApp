import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Preskoči API rute
  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Zaštićene rute
  const isProtectedRoute = path === "/dashboard" || path === "/success" || path === "/guest/dashboard";
  const hasSession = request.cookies.has("guest_session");

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/success", "/guest/dashboard"],
};
