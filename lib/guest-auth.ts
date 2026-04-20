import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Validates guest session token from cookie against database.
 * Returns guest with event data, or null if invalid/expired.
 */
export async function getAuthenticatedGuest() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("guest_session")?.value;
  if (!sessionToken) return null;

  const guest = await prisma.guest.findFirst({
    where: { sessionToken },
    include: {
      event: { select: { id: true, slug: true, imageLimit: true, pricingTier: true } }
    }
  });

  if (!guest) return null;
  if (guest.sessionExpires && guest.sessionExpires < new Date()) return null;

  return guest;
}
