import { prisma } from './prisma';

/**
 * Proverava da li je gost autentifikovan na osnovu email adrese
 * @param email Email adresa gosta
 * @returns Vraća gosta ako je autentifikovan, null ako nije
 */
export async function getGuestByEmail(email: string, eventId?: string) {
  if (!email) return null;

  try {
    const guest = await prisma.guest.findFirst({
      where: {
        email,
        ...(eventId ? { eventId } : {})
      },
      include: {
        images: true,
        message: true
      }
    });

    return guest;
  } catch (error) {
    console.error('Greška pri proveri autentifikacije:', error);
    return null;
  }
}

/**
 * Proverava da li je gost autentifikovan na osnovu ID-a
 * @param id ID gosta
 * @returns Vraća gosta ako je autentifikovan, null ako nije
 */
export async function getGuestById(id: string, eventId?: string) {
  if (!id) return null;

  try {
    const guest = await prisma.guest.findFirst({
      where: {
        id,
        ...(eventId ? { eventId } : {})
      },
      include: {
        images: true,
        message: true
      }
    });

    return guest;
  } catch (error) {
    console.error('Greška pri proveri autentifikacije:', error);
    return null;
  }
}

// Funkcija verifyCode je uklonjena jer se više ne koristi verifikacioni kod za prijavu gostiju
