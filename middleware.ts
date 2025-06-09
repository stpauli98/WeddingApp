import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Podržani jezici
const supportedLanguages = ['sr', 'en'];
const defaultLanguage = 'sr';

// Putanje koje ne zahtijevaju jezični prefiks
const exemptPaths = [
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

// Funkcija za provjeru je li ruta admin ruta
const isAdminRoute = (path: string): boolean => {
  return path.includes('/admin/');
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
    // Provjeri za dvostruke jezične prefikse (npr. /en/sr)
    const pathSegments = path.split('/').filter(segment => segment);
    if (pathSegments.length >= 2 && 
        supportedLanguages.includes(pathSegments[0]) && 
        supportedLanguages.includes(pathSegments[1])) {
      // Detektiran dvostruki jezični prefiks, preusmjeri na ispravan URL s drugim jezikom
      const newLang = pathSegments[1];
      const remainingPath = '/' + pathSegments.slice(2).join('/');
      
      const url = request.nextUrl.clone();
      url.pathname = `/${newLang}${remainingPath}`;
      
      const response = NextResponse.redirect(url);
      response.cookies.set('i18nextLng', newLang, { 
        maxAge: 60 * 60 * 24 * 365, // 1 godina
        path: '/' 
      });
      return response;
    }
    
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
    
    // Ako je admin ruta s jezičnim prefiksom, rewrite na odgovarajuću rutu bez prefiksa
    if (isAdminRoute(path)) {
      const newPath = path.replace(`/${language}/admin`, '/admin');
      
      // Rewrite rute, ali zadrži jezični prefiks u URL-u
      const url = request.nextUrl.clone();
      url.pathname = newPath;
      
      // Dodajemo originalnu putanju kao header da bismo je mogli koristiti za preusmjeravanje nakon prijave
      const originalUrl = request.url;
      
      // Postavi kolačić s jezikom da bi i18n mogao detektirati jezik
      const response = NextResponse.rewrite(url);
      response.cookies.set('i18nextLng', language as string, { 
        maxAge: 60 * 60 * 24 * 365, // 1 godina
        path: '/' 
      });
      
      // Postavljamo originalnu putanju kao header za kasnije korištenje
      response.headers.set('x-language-prefix', language as string);
      
      return response;
    }
    
    // Provjera sessiona i protected ruta
    const isProtected = path.includes('/dashboard') || path.includes('/success');
    if (isProtected && !request.cookies.has('guest_session')) {
      const redirect = `/${language}`;
      return NextResponse.redirect(new URL(redirect, request.url));
    }

    // Za ostale rute s jezičnim prefiksom, samo postavi kolačić i nastavi
    const nextResponse = NextResponse.next();
    nextResponse.cookies.set('i18nextLng', language as string, { 
      maxAge: 60 * 60 * 24 * 365, // 1 godina
      path: '/' 
    });
    return nextResponse;
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
  
  // Provjeri je li trenutna putanja samo jezični prefiks (npr. /sr ili /en)
  // Ovo sprječava dvostruke jezične prefikse poput /sr/sr
  if (path === `/${lang}`) {
    // Ako je putanja već samo jezični prefiks, ne radimo ništa
    return NextResponse.next();
  }
  
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
