import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Funkcija koja se izvršava za svaki zahtev
export function middleware(request: NextRequest) {

  // Provera da li je korisnik vec autentifikovan
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const guest = request.cookies.get('guest')?.value;

  // Dobijanje putanje
  const path = request.nextUrl.pathname

  // Preskakanje middleware-a za API rute
  if (path.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Definisanje putanja koje zahtevaju autentifikaciju
  const isProtectedRoute = path === "/dashboard" || path === "/success"

  // Dobijanje auth cookie-a
  const isAuthenticated = request.cookies.has("auth")

  // Dobijanje userData cookie-a
  const hasUserData = request.cookies.has("userData")

  // Ako je putanja zaštićena i korisnik nije autentifikovan, preusmeravanje na početnu stranicu
  if (isProtectedRoute && !isAuthenticated) {
    console.log("Middleware: Korisnik nije autentifikovan za zaštićenu rutu:", path)
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Ako korisnik pokušava da pristupi stranici za verifikaciju bez prethodnog logina
  if (path === "/verify" && !hasUserData) {
    console.log("Middleware: Korisnik nema userData za verifikaciju")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Ako je korisnik već autentifikovan i pokušava da pristupi stranicama za prijavu
  if (isAuthenticated && path === "/") {
    console.log("Middleware: Korisnik je već autentifikovan, preusmeravanje na dashboard")
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// Definisanje putanja za koje se middleware izvršava
export const config = {
  matcher: ["/", "/verify", "/dashboard", "/success"],
}
