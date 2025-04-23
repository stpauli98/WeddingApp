import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    // Validacija koda
    if (!code) {
      return NextResponse.json({ error: "Verifikacioni kod je obavezan" }, { status: 400 })
    }

    // Dobijanje podataka korisnika iz cookie-a
    const userDataCookie = (await cookies()).get("userData")

    if (!userDataCookie || !userDataCookie.value) {
      return NextResponse.json({ error: "Sesija je istekla, molimo prijavite se ponovo" }, { status: 401 })
    }

    let userData
    try {
      userData = JSON.parse(userDataCookie.value)
    } catch (e) {
      console.error("Error parsing userData cookie:", e)
      return NextResponse.json({ error: "Nevažeća sesija, molimo prijavite se ponovo" }, { status: 401 })
    }

    // Provera verifikacionog koda
    if (userData.verificationCode !== code) {
      return NextResponse.json({ error: "Neispravan verifikacioni kod" }, { status: 400 })
    }

    // Postavljanje auth cookie-a
    (await cookies()).set({
      name: "auth",
      value: "true",
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
