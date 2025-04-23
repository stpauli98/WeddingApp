import { NextResponse } from "next/server"

export async function POST() {
  // Brišemo cookie 'auth' tako što ga postavljamo kao praznog i expirovanog
  const response = NextResponse.json({ success: true })
  response.cookies.set("auth", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax"
  })
  return response
}
