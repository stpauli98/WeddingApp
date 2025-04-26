import { NextResponse } from "next/server"
import { verifyCode } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { code, email } = await request.json()

    // Validacija koda i email-a
    if (!code) {
      return NextResponse.json({ error: "Verifikacioni kod je obavezan" }, { status: 400 })
    }
    
    if (!email) {
      return NextResponse.json({ error: "Email adresa je obavezna" }, { status: 400 })
    }

    // Verifikacija koda
    const guest = await verifyCode(email, code)

    if (!guest) {
      return NextResponse.json({ error: "Neispravan kod ili je istekao" }, { status: 400 })
    }

    // Postavi session cookie i vrati odgovor
    const response = NextResponse.json({ success: true });
    response.cookies.set("guest_session", guest.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 sata
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Verification error:", error)
        return NextResponse.json({ error: "Došlo je do greške prilikom verifikacije" }, { status: 500 })
      }
}
