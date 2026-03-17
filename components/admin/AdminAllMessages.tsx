"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface MessageData {
  id: string;
  text: string;
  guestName?: string;
  createdAt: string | Date;
}

interface AdminAllMessagesProps {
  messages: MessageData[];
}

async function generateMessagesPdf(messages: MessageData[]) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const cardPadding = 12;
  const cardGap = 18;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  const titleSize = 22;
  const titleText = "Poruke gostiju";
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (pageWidth - titleWidth) / 2,
    y: y - titleSize,
    size: titleSize,
    font: fontBold,
    color: rgb(0.72, 0.61, 0.18),
  });
  y -= titleSize + 10;

  // Subtitle
  const subtitleSize = 10;
  const subtitleText = "Poruke i cestitke koje su gosti ostavili mladencima";
  const subtitleWidth = font.widthOfTextAtSize(subtitleText, subtitleSize);
  page.drawText(subtitleText, {
    x: (pageWidth - subtitleWidth) / 2,
    y: y - subtitleSize,
    size: subtitleSize,
    font,
    color: rgb(0.5, 0.43, 0.14),
  });
  y -= subtitleSize + 30;

  // Sort messages by date descending
  const sorted = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const msg of sorted) {
    const nameText = msg.guestName || "Nepoznat gost";
    const dateText = new Date(msg.createdAt).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Word-wrap message text
    const msgText = (msg.text || "").replace(/\r?\n/g, " ");
    const words = msgText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    const textSize = 10;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, textSize) > contentWidth - cardPadding * 2) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Calculate card height
    const headerHeight = 18;
    const textBlockHeight = lines.length * lineHeight;
    const cardHeight = cardPadding * 2 + headerHeight + textBlockHeight + 4;

    // New page if needed
    if (y - cardHeight < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Card background
    page.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: rgb(0.98, 0.98, 0.96),
      borderColor: rgb(0.89, 0.78, 0.36),
      borderWidth: 0.5,
    });

    // Left accent bar
    page.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: 4,
      height: cardHeight,
      color: rgb(0.89, 0.78, 0.36),
    });

    // Name
    const nameY = y - cardPadding - 12;
    page.drawText(nameText, {
      x: margin + cardPadding + 6,
      y: nameY,
      size: 11,
      font: fontBold,
      color: rgb(0.72, 0.61, 0.18),
    });

    // Date (right-aligned)
    const dateWidth = font.widthOfTextAtSize(dateText, 8);
    page.drawText(dateText, {
      x: margin + contentWidth - cardPadding - dateWidth,
      y: nameY + 1,
      size: 8,
      font,
      color: rgb(0.5, 0.43, 0.14),
    });

    // Message lines
    let textY = nameY - headerHeight;
    for (const line of lines) {
      page.drawText(line, {
        x: margin + cardPadding + 6,
        y: textY,
        size: textSize,
        font,
        color: rgb(0.18, 0.13, 0.03),
      });
      textY -= lineHeight;
    }

    y -= cardHeight + cardGap;
  }

  return await pdf.save();
}

const AdminAllMessages: React.FC<AdminAllMessagesProps> = ({ messages }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const pdfBytes = await generateMessagesPdf(messages);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "poruke-gostiju.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ variant: "destructive", description: "Greška pri generisanju PDF-a" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--lp-muted-foreground))]">
        <span className="text-6xl mb-2">💬</span>
        <div className="italic mb-2">Nema poruka od gostiju.</div>
        <div className="text-sm text-[hsl(var(--lp-muted-foreground))] text-center max-w-xs">Kada gosti ostave čestitku ili poruku, ovde će se pojaviti njihove lepe reči i želje za mladence.</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex items-center gap-2"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
              Generisanje...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Preuzmi PDF
            </>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(msg => (
          <div key={msg.id} className="relative flex flex-col gap-2 bg-white/80 border border-[hsl(var(--lp-accent))]/20 rounded-2xl shadow-lg p-5 min-h-[120px]">
            <svg className="absolute -top-4 left-4 text-2xl" aria-label="Poruka gosta" role="img">💌</svg>
            <div className="text-base text-[hsl(var(--lp-text))] font-medium mb-1 mt-2 whitespace-pre-line">{msg.text}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold text-[hsl(var(--lp-accent))] flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Gost" role="img"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" /></svg>
                {msg.guestName ? msg.guestName : 'Nepoznat gost'}
              </span>
              <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                {typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleString('sr-latn') : msg.createdAt.toLocaleString('sr-latn')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAllMessages;
