// lib/email.ts
export async function sendVerificationEmail(email: string, code: string) {
    // U produkciji ovde koristi nodemailer ili sličan servis
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    // Simuliraj kašnjenje slanja emaila
    return Promise.resolve();
  }