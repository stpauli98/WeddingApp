import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma';
import { getGuestByEmail } from '@/lib/auth';
import nodemailer from 'nodemailer';

import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  // Generiši kriptografski siguran random string
  const csrfToken = crypto.randomBytes(32).toString("hex");

  // Postavi ga u httpOnly kolačić (važi 30min)
  const response = NextResponse.json({ csrfToken });
  response.cookies.set("csrf_token_guest_login", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minuta
    path: "/"
  });

  return response;
}

// Funkcija za generisanje HTML emaila
const getEmailHtml = (firstName: string, code: string) => `
  <div style="background:#f9fafb;padding:32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:420px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 4px 16px #0001;">
      <tr>
        <td style="padding:32px 32px 16px 32px;text-align:center;">
          <img src="https://pmbljucihvdxmkskivnc.supabase.co/storage/v1/object/public/wedding-images/favicon.ico" alt="Moja Svadba" width="48" height="48" style="margin-bottom:12px;" />
          <h1 style="margin:0 0 8px 0;font-size:1.7rem;color:#8b5cf6;">Dobrodošli, ${firstName}!</h1>
          <p style="margin:0 0 16px 0;color:#374151;font-size:1.05rem;">Hvala što koristite aplikaciju <b>Moja Svadba</b>!<br>Vaš verifikacioni kod:</p>
          <div style="display:inline-block;padding:16px 32px;font-size:2.2rem;font-weight:700;letter-spacing:6px;background:#f3f4f6;color:#8b5cf6;border-radius:8px;border:2px dashed #d1d5db;margin-bottom:20px;">
            ${code}
          </div>
          <p style="margin:24px 0 0 0;color:#6b7280;font-size:0.98rem;">
            Unesite ovaj kod u aplikaciju da biste potvrdili svoju email adresu.<br>
            Kod važi 30 minuta.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px 32px;text-align:center;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px 0;" />
          <span style="color:#a1a1aa;font-size:0.9rem;">Ako niste vi pokrenuli ovaj zahtev, slobodno ignorišite ovu poruku.</span><br />
          <span style="color:#ef4444;font-size:0.95rem;font-weight:500;display:block;margin-top:12px;">Ne odgovarajte na ovu poruku. Ova email adresa nije praćena.</span>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 16px 0;text-align:center;">
          <span style="color:#d1d5db;font-size:0.85rem;">&copy; ${new Date().getFullYear()} Moja Svadba</span>
        </td>
      </tr>
    </table>
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
      from: `Moja Svadba - Do Not Reply <${process.env.ADMIN_EMAIL}>`,
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
    // 1. Provera CSRF tokena
    const reqCookies = await cookies();
    const csrfCookie = reqCookies.get("csrf_token_guest_login")?.value;
    const csrfHeader = request.headers.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "Neispravan CSRF token. Osvežite stranicu i pokušajte ponovo." }, { status: 403 });
    }

    const { firstName, lastName, email, eventSlug } = await request.json()

    // Validacija podataka
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Sva polja su obavezna" }, { status: 400 })
    }

    // Provera eventSlug i pronalazak eventa
    if (!eventSlug || typeof eventSlug !== 'string') {
      return NextResponse.json({ error: "Nedostaje event identifikator u linku. Kontaktirajte mladence ili proverite link!" }, { status: 400 });
    }
    const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
    if (!event) {
      return NextResponse.json({ error: "Ne postoji događaj za dati link. Kontaktirajte mladence ili proverite link!" }, { status: 404 });
    }

    // Provjera da li korisnik već postoji u bazi
    const existingGuest = await prisma.guest.findFirst({
      where: { 
        email,
        eventId: event.id
      }
    });
    
    let guestId;
    
    if (existingGuest) {
      // Ažuriranje postojećeg korisnika i automatska verifikacija
      const updatedGuest = await prisma.guest.update({
        where: { id: existingGuest.id },
        data: {
          firstName,
          lastName,
          verified: true,
          code: null,
          codeExpires: null
        }
      });
      guestId = updatedGuest.id;
    } else {
      // Kreiranje novog korisnika i automatska verifikacija
      const newGuest = await prisma.guest.create({
        data: {
          eventId: event.id,
          firstName,
          lastName,
          email,
          verified: true
        }
      });
      guestId = newGuest.id;
    }

    // Postavi session cookie i vrati odgovor
    const response = NextResponse.json({ 
      success: true, 
      verified: true,
      guestId,
      eventId: event.id
    });
    
    // Postavi guest_session cookie sa ID-om gosta
    response.cookies.set("guest_session", guestId, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    
    // Postavi guest_event cookie sa ID-om eventa
    response.cookies.set("guest_event", event.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    
    return response
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Došlo je do greške prilikom prijave" 
    }, { status: 500 });
  }
}
