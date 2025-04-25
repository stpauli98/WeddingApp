import { NextResponse } from "next/server"

export async function POST() {
  // Brišemo session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("guest_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
