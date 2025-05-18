// Skripta za slanje podsjetnika gostima koji nisu uploadovali svih 10 slika za event "sran-i-aleksandra"
// Pokreni: node scripts/sendImageReminder.js

const { prisma } = require("./lib/prisma.js");
const nodemailer = require("nodemailer");

const EVENT_SLUG = "sran-i-aleksandra";
const MAX_IMAGES = 10;

// Konfiguriši transporter (koristi .env varijable ili zamijeni sa svojim podacima)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email", // zamijeni za produkciju
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "test@ethereal.email",
    pass: process.env.SMTP_PASS || "testpass",
  },
});

function getMailText(firstName, sent, max) {
  return `Cao ${firstName},\n\nVidimo da si poslao/la ${sent}/${max} slika za svadbu. Ako želiš, možeš mladenicima poslati još ${max - sent} slika.\n\nLink za upload: https://www.mojasvadbaa.com/event/${EVENT_SLUG}\n\nHvala ti što učestvuješ u uspomenama!\n\nPozdrav,\nMladenci`;
}

async function main() {
  const event = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    include: { guests: { include: { images: true } } },
  });
  if (!event) {
    console.error("Event nije pronađen!");
    process.exit(1);
  }

  for (const guest of event.guests) {
    const sent = guest.images.length;
    if (sent >= MAX_IMAGES) continue;
    if (!guest.email) continue;

    const mailOptions = {
      from: 'Mladenci <noreply@mojasvadbaa.com>',
      to: guest.email,
      subject: `Podsjetnik: Pošalji slike za svadbu (${sent}/${MAX_IMAGES})`,
      text: getMailText(guest.firstName, sent, MAX_IMAGES),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Poslat podsjetnik za: ${guest.email} (${sent}/${MAX_IMAGES} slika)`);
    } catch (err) {
      console.error(`Greška pri slanju za ${guest.email}:`, err);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
