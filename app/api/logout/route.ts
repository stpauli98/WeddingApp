import { NextResponse } from "next/server"

export async function POST() {
  // Logout bez cookie-a - samo vraćamo uspešan odgovor
  // Klijent je odgovoran za čišćenje lokalnog stanja
  return NextResponse.json({ success: true })
}
