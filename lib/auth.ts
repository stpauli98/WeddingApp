import { prisma } from './prisma';

/**
 * Proverava da li je gost autentifikovan na osnovu email adrese
 * @param email Email adresa gosta
 * @returns Vraća gosta ako je autentifikovan, null ako nije
 */
export async function getGuestByEmail(email: string) {
  if (!email) return null;

  try {
    const guest = await prisma.guest.findUnique({
      where: { 
        email,
        verified: true
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
export async function getGuestById(id: string) {
  if (!id) return null;

  try {
    const guest = await prisma.guest.findUnique({
      where: { 
        id,
        verified: true
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
 * Proverava verifikacioni kod
 * @param email Email adresa gosta
 * @param code Verifikacioni kod
 * @returns Vraća gosta ako je kod validan, null ako nije
 */
export async function verifyCode(email: string, code: string) {
  if (!email || !code) return null;

  try {
    const guest = await prisma.guest.findFirst({
      where: { 
        email,
        code,
        verified: false,
        codeExpires: {
          gt: new Date() // Kod nije istekao
        }
      }
    });

    if (guest) {
      // Označi gosta kao verifikovanog
      await prisma.guest.update({
        where: { id: guest.id },
        data: { 
          verified: true,
          code: null,
          codeExpires: null
        }
      });

      return guest;
    }

    return null;
  } catch (error) {
    console.error('Greška pri verifikaciji koda:', error);
    return null;
  }
}
