import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Podržani jezici
const supportedLanguages = ['sr', 'en'];
const defaultLanguage = 'sr';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Preskoči API rute
  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Provjera jezičnih ruta
  if (supportedLanguages.some(lang => path === `/${lang}`)) {
    // Ako je ruta samo /sr ili /en, preusmjeri na početnu stranicu s tim jezikom
    const lang = path.split('/')[1];
    return NextResponse.redirect(new URL('/', request.url));
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
  matcher: ["/dashboard", "/success", "/guest/dashboard", "/sr", "/en"],
};
