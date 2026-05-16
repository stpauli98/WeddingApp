import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Validates admin session and returns admin + event data.
 * Returns null if session is invalid or expired.
 */
export async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  if (!sessionToken) return null;

  const session = await prisma.adminSession.findUnique({
    where: { sessionToken },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          event: {
            select: {
              id: true,
              slug: true,
              coupleName: true,
              pricingTier: true,
              imageLimit: true,
              activatedAt: true,
              pendingPaymentExpiresAt: true,
            },
          },
        },
      },
    },
  });

  if (!session || !session.admin) return null;
  if (session.expiresAt < new Date()) return null;

  return session.admin;
}
