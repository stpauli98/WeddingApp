import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

// GET — issues a CSRF token for admin image actions (DELETE on /[id]).
export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set("set-cookie", cookie);
  return response;
}
