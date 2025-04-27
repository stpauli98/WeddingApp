import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pronađi sve poruke iz baze
    const messages = await prisma.message.findMany({
      select: { id: true, text: true, createdAt: true, guest: { select: { firstName: true, lastName: true } } },
    });
    if (!messages.length) {
      return new NextResponse("Nema poruka za preuzimanje", { status: 404 });
    }
    // Pripremi HTML za download
    const htmlRows = messages.map(msg => {
      const ime = msg.guest?.firstName ? msg.guest.firstName : '';
      const prezime = msg.guest?.lastName ? msg.guest.lastName : '';
      const poruka = (msg.text || '').replace(/\r?\n/g, '<br>');
      const datum = msg.createdAt ? new Date(msg.createdAt).toLocaleString('sr-RS') : '';
      return `
        <div class="card">
          <div class="card-header">
            <span class="card-name">${ime} ${prezime}</span>
            <span class="card-date">${datum}</span>
          </div>
          <div class="card-message">${poruka}</div>
        </div>
      `;
    }).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <title>Poruke gostiju</title>
  <style>
    body {
      font-family: 'Segoe UI', 'Arial', sans-serif;
      background: #faf9f6;
      color: #2d2108;
      margin: 0; padding: 0;
    }
    .container {
      max-width: 750px;
      margin: 40px auto 30px auto;
      background: #fffbe7;
      border-radius: 18px;
      box-shadow: 0 2px 12px 0 #e6d7b3;
      padding: 36px 24px 32px 24px;
    }
    h1 {
      text-align: center;
      font-size: 2.3rem;
      color: #b89c2e;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .intro {
      text-align: center;
      color: #a08a2d;
      font-size: 1.1rem;
      margin-bottom: 32px;
    }
    .card {
      background: #fafaf7;
      border-left: 6px solid #e3c75c;
      border-radius: 12px;
      box-shadow: 0 1px 8px 0 #f2e7c3;
      margin-bottom: 22px;
      padding: 18px 22px 14px 22px;
      transition: box-shadow 0.2s;
      page-break-inside: avoid;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-name {
      font-weight: bold;
      color: #b89c2e;
      font-size: 1.13rem;
      letter-spacing: 0.5px;
    }
    .card-date {
      color: #a08a2d;
      font-size: 0.97rem;
      font-style: italic;
    }
    .card-message {
      color: #2d2108;
      font-size: 1.08rem;
      line-height: 1.5;
      margin-left: 6px;
      word-break: break-word;
    }
    @media print {
      body { background: #fff; }
      .container { box-shadow: none; }
      .card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Poruke gostiju</h1>
    <div class="intro">Ovo su poruke i čestitke koje su gosti ostavili mladencima na dan venčanja.</div>
    ${htmlRows}
  </div>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename=poruke.html`,
      },
    });
  } catch (err) {
    console.error('Greška pri generisanju CSV-a:', err);
    return NextResponse.json({ error: "Greška pri generisanju CSV-a", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
