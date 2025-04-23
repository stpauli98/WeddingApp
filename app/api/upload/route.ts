import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Provera autentifikacije
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth");

    if (!authCookie) {
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 })
    }

    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const message = formData.get("message") as string

    // Validacija broja slika
    if (images.length > 10) {
      return NextResponse.json({ error: "Možete poslati najviše 10 slika" }, { status: 400 })
    }

    // Ovde bi bio kod za upload slika na cloud (npr. S3)
    // i čuvanje podataka u bazi
    console.log(`Uploading ${images.length} images and message: ${message}`)

    // Simulacija obrade zahteva
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Došlo je do greške prilikom slanja" }, { status: 500 })
  }
}
