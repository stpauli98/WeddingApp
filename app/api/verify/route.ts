import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
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

    return NextResponse.json({ 
      success: true,
      guestId: guest.id
    })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Došlo je do greške prilikom verifikacije" }, { status: 500 })
  }
}
