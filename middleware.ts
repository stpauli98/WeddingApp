import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Podržani jezici
const supportedLanguages = ['sr', 'en'];
const defaultLanguage = 'sr';

// Funkcija za provjeru je li ruta guest ruta
const isGuestRoute = (path: string): boolean => {
  return path.includes('/guest/');
};

// Funkcija za provjeru ima li ruta jezični prefiks
const hasLanguagePrefix = (path: string): boolean => {
  return supportedLanguages.some(lang => path.startsWith(`/${lang}/`));
};

// Funkcija za dobivanje jezika iz rute
const getLanguageFromPath = (path: string): string | null => {
  const segments = path.split('/');
  if (segments.length > 1 && supportedLanguages.includes(segments[1])) {
    return segments[1];
  }
  return null;
};

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
  
  // Rewrite za guest rute s jezičnim prefiksom
  if (hasLanguagePrefix(path) && isGuestRoute(path)) {
    const language = getLanguageFromPath(path);
    const newPath = path.replace(`/${language}/guest`, '/guest');
    
    // Rewrite rute, ali zadrži jezični prefiks u URL-u
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    
    // Postavi kolačić s jezikom da bi i18n mogao detektirati jezik
    const response = NextResponse.rewrite(url);
    response.cookies.set('i18nextLng', language as string, { 
      maxAge: 60 * 60 * 24 * 365, // 1 godina
      path: '/' 
    });
    return response;
  }

  // Zaštićene rute
  const isProtectedRoute = path === "/dashboard" || path === "/success" || path === "/guest/dashboard" ||
    path.match(/^\/[a-z]{2}\/guest\/dashboard$/); // Uključuje i rute s jezičnim prefiksom
  const hasSession = request.cookies.has("guest_session");

  if (isProtectedRoute && !hasSession) {
    // Ako ruta ima jezični prefiks, preusmjeri na odgovarajuću početnu stranicu s tim jezikom
    if (path.match(/^\/[a-z]{2}\//)) {
      const lang = path.split('/')[1];
      return NextResponse.redirect(new URL(`/${lang}`, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Standardne rute
    "/dashboard", "/success", "/guest/dashboard", "/guest/login", "/guest/success", 
    // Jezične rute
    "/sr", "/en", 
    // Guest rute s jezičnim prefiksom
    "/sr/guest/:path*", "/en/guest/:path*"
  ],
};
