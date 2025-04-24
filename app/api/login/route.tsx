import { NextResponse } from "next/server"
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email-template';
import { prisma } from '@/lib/prisma';
import { getGuestByEmail } from '@/lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email: string, code: string, firstName: string) => {
  const { error } = await resend.emails.send({
    from: 'Wedding App <no-reply@resend.dev>',
    to: [email],
    subject: 'Vaš verifikacioni kod',
    react: <EmailTemplate firstName={firstName} code={code} />,
  });
  if (error) {
    throw new Error('Greška pri slanju email-a: ' + error.message);
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email } = await request.json()

    // Validacija podataka
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Sva polja su obavezna" }, { status: 400 })
    }

    // Provjera da li korisnik već postoji u bazi i da li je već verifikovan
    const existingGuest = await getGuestByEmail(email)

    // Ako korisnik postoji i već je verifikovan, direktno ga prijavljujemo
    if (existingGuest) {
      return NextResponse.json({ 
        success: true, 
        verified: true, 
        guestId: existingGuest.id 
      })
    }
    
    // Generisanje verifikacionog koda (6 cifara)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Postavljanje vremena isteka koda (30 minuta)
    const codeExpiresAt = new Date(Date.now() + 30 * 60 * 1000)

    if (existingGuest) {
      // Ažuriranje postojećeg korisnika sa novim kodom
      await prisma.guest.update({
        where: { email },
        data: {
          code: verificationCode,
          codeExpires: codeExpiresAt,
          verified: false
        }
      })
    } else {
      // Pronađi prvi event u bazi (privremeno rešenje)
      const event = await prisma.event.findFirst();
      if (!event) {
        return NextResponse.json({ error: "Nijedan događaj ne postoji u bazi" }, { status: 500 });
      }
      // Kreiranje novog korisnika
      await prisma.guest.create({
        data: {
          eventId: event.id,
          firstName,
          lastName,
          email,
          code: verificationCode,
          codeExpires: codeExpiresAt
        }
      })
    }

    // Slanje verifikacionog email-a
    await sendVerificationEmail(email, verificationCode, firstName)

    return NextResponse.json({ success: true, verified: false, email })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Došlo je do greške prilikom prijave" }, { status: 500 })
  }
}
