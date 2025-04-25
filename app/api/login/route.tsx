import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma';
import { getGuestByEmail } from '@/lib/auth';
import nodemailer from 'nodemailer';

// Funkcija za generisanje HTML emaila
const getEmailHtml = (firstName: string, code: string) => `
  <div style="font-family:sans-serif;max-width:400px;">
    <h2>Zdravo, ${firstName}!</h2>
    <p>Vaš verifikacioni kod je:</p>
    <div style="font-size:2rem;font-weight:bold;margin:16px 0;">${code}</div>
    <p>Unesite ovaj kod u aplikaciju da biste nastavili.</p>
  </div>
`;

const sendVerificationEmail = async (email: string, code: string, firstName: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'Vaš verifikacioni kod',
      html: getEmailHtml(firstName, code),
    });
    return true;
  } catch (error: any) {
    throw new Error('Greška pri slanju email-a: ' + error.message);
  }
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
    if (existingGuest && existingGuest.verified) {
      const response = NextResponse.json({ 
        success: true, 
        verified: true, 
        guestId: existingGuest.id 
      });
      response.cookies.set("guest_session", existingGuest.id, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24, // 24h
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
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
    return NextResponse.json({ error: "Došlo je do greške prilikom prijave" }, { status: 500 })
  }
}
