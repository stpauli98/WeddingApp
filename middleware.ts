import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Funkcija koja se izvršava za svaki zahtev
export async function middleware(request: NextRequest) {
  // Dobijanje putanje
  const path = request.nextUrl.pathname

  // Preskakanje middleware-a za API rute
  if (path.startsWith("/api/")) {
    return NextResponse.next()
  }
  
  // Preskakanje middleware-a za dashboard i success rute sa parametrima
  if ((path === "/dashboard" || path === "/success") && request.nextUrl.searchParams.has("guestId")) {
    console.log(`Middleware: Dozvoljavam pristup za ${path} sa guestId parametrom`)
    return NextResponse.next()
  }
  
  // Definisanje putanja koje zahtevaju autentifikaciju
  const isProtectedRoute = path === "/dashboard" || path === "/success"

  // Ako je putanja zaštićena bez parametara, preusmeravanje na početnu stranicu
  if (isProtectedRoute) {
    console.log("Middleware: Korisnik nije autentifikovan za zaštićenu rutu:", path)
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

// Definisanje putanja za koje se middleware izvršava
export const config = {
  matcher: ["/", "/verify", "/dashboard", "/success"],
}
