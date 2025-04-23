import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email-template';

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

    // Generisanje verifikacionog koda (6 cifara)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Slanje verifikacionog email-a
    await sendVerificationEmail(email, verificationCode, firstName)

    // Čuvanje podataka u cookie (u pravoj aplikaciji, ovo bi bilo u bazi)
    const userData = {
      firstName,
      lastName,
      email,
      verificationCode,
    }

    // Postavljanje cookie-a sa podacima korisnika
    const cookieStore = await cookies();
    cookieStore.set({
      name: "userData",
      value: JSON.stringify(userData),
      maxAge: 60 * 30, // 30 minuta
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Došlo je do greške prilikom prijave" }, { status: 500 })
  }
}
