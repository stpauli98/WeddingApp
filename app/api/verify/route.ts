import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    // Validacija koda
    if (!code) {
      return NextResponse.json({ error: "Verifikacioni kod je obavezan" }, { status: 400 })
    }

    // Pronalaženje korisnika u bazi podataka prema kodu
    const guest = await prisma.guest.findFirst({
      where: { 
        code,
        verified: false
      }
    })

    if (!guest) {
      return NextResponse.json({ error: "Korisnik nije pronađen" }, { status: 404 })
    }

    // Provjera da li je kod istekao
    if (guest.code_expires_at && new Date() > guest.code_expires_at) {
      return NextResponse.json({ error: "Verifikacioni kod je istekao, molimo zatražite novi" }, { status: 400 })
    }

    // Provjera verifikacionog koda
    if (guest.code !== code) {
      return NextResponse.json({ error: "Neispravan verifikacioni kod" }, { status: 400 })
    }

    // Ažuriranje statusa verifikacije u bazi
    await prisma.$transaction(async (tx) => {
      await tx.guest.update({
        where: { id: guest.id },
        data: { verified: true, code: null, code_expires_at: null }
      })
    })

    // Postavljanje auth cookie-a sa ID-em gosta
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth",
      value: guest.id,
      maxAge: 60 * 60 * 24, // 24 sata
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Došlo je do greške prilikom verifikacije" }, { status: 500 })
  }
}
