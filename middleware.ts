import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Podržani jezici
const supportedLanguages = ['sr', 'en'];
const defaultLanguage = 'sr';

// Putanje koje ne zahtijevaju jezični prefiks
const exemptPaths = [
  '/',                // Root stranica
  '/api',             // API rute
  '/_next',           // Next.js interne rute
  '/favicon.ico',     // Favicon
  '/robots.txt',      // Robots.txt
  '/sitemap.xml',     // Sitemap
  '/manifest.json'    // PWA manifest
];

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

  // Preskoči putanje koje ne zahtijevaju jezični prefiks
  for (const exemptPath of exemptPaths) {
    if (path === exemptPath || path.startsWith(`${exemptPath}/`)) {
      return NextResponse.next();
    }
  }
  
  // Provjeri ima li ruta već jezični prefiks
  if (hasLanguagePrefix(path)) {
    // Ako ima jezični prefiks, nastavi s obradom
    const language = getLanguageFromPath(path);
    
    // Ako je guest ruta s jezičnim prefiksom, rewrite na odgovarajuću rutu bez prefiksa
    if (isGuestRoute(path)) {
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
    
    // Za ostale rute s jezičnim prefiksom, samo postavi kolačić i nastavi
    const response = NextResponse.next();
    response.cookies.set('i18nextLng', language as string, { 
      maxAge: 60 * 60 * 24 * 365, // 1 godina
      path: '/' 
    });
    return response;
  }
  
  // Zaštićene rute - provjera sesije
  const isProtectedRoute = path.includes("/dashboard") || path.includes("/success");
  const hasSession = request.cookies.has("guest_session");

  if (isProtectedRoute && !hasSession) {
    // Ako ruta ima jezični prefiks, preusmjeri na odgovarajuću početnu stranicu s tim jezikom
    if (hasLanguagePrefix(path)) {
      const lang = getLanguageFromPath(path);
      return NextResponse.redirect(new URL(`/${lang}`, request.url));
    }
    // Inače preusmjeri na root s defaultnim jezikom
    return NextResponse.redirect(new URL(`/${defaultLanguage}`, request.url));
  }
  
  // Ako ruta nema jezični prefiks, preusmjeri na verziju s prefiksom
  
  // Provjeri ima li URL parametar za jezik eventa
  const eventLang = request.nextUrl.searchParams.get('lang');
  
  // Dohvati jezik iz URL parametra, kolačića ili koristi defaultni
  const langCookie = request.cookies.get('i18nextLng');
  const lang = eventLang || langCookie?.value || defaultLanguage;
  
  // Kloniraj URL i postavi novu putanju s jezičnim prefiksom
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${path}`;
  
  // Postavi kolačić s jezikom da bi se zapamtio između refresha
  const response = NextResponse.redirect(url);
  response.cookies.set('i18nextLng', lang, { 
    maxAge: 60 * 60 * 24 * 365, // 1 godina
    path: '/' 
  });
  
  return response;
}

export const config = {
  matcher: [
    // Hvataj sve rute osim onih koje su izuzete
    '/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
