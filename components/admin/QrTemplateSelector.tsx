"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Check } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";

// Definiramo tipove za predloške
interface TemplateOption {
  id: string;
  name: string;
  imageSrc: string;
  qrPosition: {
    x: number; // postotak širine
    y: number; // postotak visine
    width: number; // postotak širine
    height: number; // postotak visine
  };
}

interface QrTemplateSelectorProps {
  qrValue: string;
  qrColor: string;
  eventSlug: string;
}

// Lista dostupnih predložaka (možemo lako dodati nove)
const templates: TemplateOption[] = [
  {
    id: 'template1',
    name: 'Elegantni',
    imageSrc: '/templates/wedding-template-1.jpg',
    qrPosition: { x: 50, y: 86, width: 35, height: 25 },
  },
  {
    id: 'template2',
    name: 'Rustični',
    imageSrc: '/templates/wedding-template-2.jpg',
    qrPosition: { x: 49, y: 52, width: 45, height: 33 },
  },
];

// Helper za dohvat inicijalnog predloška (prvi u listi)
const getInitialTemplate = () => templates[0];

const QrTemplateSelector: React.FC<QrTemplateSelectorProps> = ({ qrValue, qrColor, eventSlug }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentLanguage = getCurrentLanguageFromPath(pathname);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const templateImageRef = useRef<HTMLImageElement | null>(null);
  
  // State za odabrani predložak
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(getInitialTemplate);

  // Konstruiramo putanju do slike predloška
  const templatePath = selectedTemplate.imageSrc;

  // Generiranje QR koda na predlošku
  const generateQrOnTemplate = async () => {
    if (!qrRef.current || !canvasRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Dohvati QR kod kao sliku
      const qrCanvas = qrRef.current.querySelector('canvas');
      if (!qrCanvas) {
        setIsGenerating(false);
        return;
      }
      
      const qrDataUrl = qrCanvas.toDataURL("image/png");
      // Koristimo globalThis.Image za ispravno tipiziranje
      const qrImage = new globalThis.Image();
      
      qrImage.onload = () => {
        if (!templateImageRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Postavi dimenzije canvasa prema dimenzijama predloška
        canvas.width = templateImageRef.current.naturalWidth;
        canvas.height = templateImageRef.current.naturalHeight;
        
        // Nacrtaj predložak
        ctx.drawImage(templateImageRef.current, 0, 0, canvas.width, canvas.height);
        
        // Izračunaj poziciju QR koda na predlošku - tačno u sredini kocke
        const qrWidth = (selectedTemplate.qrPosition.width / 100) * canvas.width;
        const qrHeight = (selectedTemplate.qrPosition.height / 100) * canvas.height;
        const qrX = (selectedTemplate.qrPosition.x / 100) * canvas.width - (qrWidth / 2);
        const qrY = (selectedTemplate.qrPosition.y / 100) * canvas.height - (qrHeight / 2);
        
        // Nacrtaj QR kod na predlošku
        ctx.drawImage(qrImage, qrX, qrY, qrWidth, qrHeight);
        
        // Spremi generirani rezultat
        const resultDataUrl = canvas.toDataURL("image/png");
        setGeneratedImage(resultDataUrl);
        setIsGenerating(false);
      };
      
      qrImage.src = qrDataUrl;
    } catch (error) {
      console.error("Greška pri generiranju QR koda na predlošku:", error);
      setIsGenerating(false);
    }
  };

  // Preuzimanje generirane slike
  const handleDownload = () => {
    if (!generatedImage) return;
    
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `qr-kod-event-${eventSlug || 'wedding'}-template.png`;
    a.click();
    
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  // Učitaj predložak pri inicijalizaciji
  useEffect(() => {
    const loadTemplateImage = () => {
      // Koristimo globalThis.Image za ispravno tipiziranje
      const img = new globalThis.Image();
      img.onload = () => {
        console.log('Slika predloška uspješno učitana:', img.src);
        templateImageRef.current = img;
        generateQrOnTemplate();
      };
      img.onerror = (error) => {
        console.error('Greška pri učitavanju slike predloška:', error, img.src);
      };
      
      // Koristimo apsolutnu putanju bez jezičkog prefiksa
      // Next.js aplikacija s višejezičnom podrškom može imati putanje s prefiksima /sr/ ili /en/
      // ali slike u public direktoriju su dostupne direktno iz korijena
      const imagePath = templatePath;
      console.log('Pokušavam učitati sliku predloška s putanje:', imagePath);
      img.src = imagePath;
    };
    
    loadTemplateImage();
  }, [templatePath]);

  // Trigger regeneracije kada promijenimo predložak ili boju QR-a
  useEffect(() => {
    if (templateImageRef.current) generateQrOnTemplate();
  }, [selectedTemplate, qrColor]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-1 sm:px-0">
      {/* Skriveni QR kod za generiranje */}
      <div className="hidden" ref={qrRef}>
        <QRCodeCanvas value={qrValue} size={500} bgColor="#FFFFFF" fgColor={qrColor} />
      </div>
      
      {/* Odabir predloška (samo thumbnails) */}
      <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setSelectedTemplate(tpl)}
            className={`border rounded-md overflow-hidden w-14 h-20 sm:w-16 sm:h-24 shrink-0 ${selectedTemplate.id === tpl.id ? 'border-[hsl(var(--lp-primary))] ring-2 ring-[hsl(var(--lp-primary))]' : 'border-gray-300'}`}
            title={tpl.name}
          >
            <img src={tpl.imageSrc} alt={tpl.name} className="object-cover w-full h-full" />
          </button>
        ))}
      </div>
      
      {/* Prikaz generiranog rezultata */}
      <div className="mt-2 sm:mt-4">
        <h3 className="text-base sm:text-lg font-medium mb-2 px-1">{t('admin.dashboard.qr.previewTemplate')}</h3>
        <div className="border border-[hsl(var(--lp-accent))]/30 rounded-lg p-3 sm:p-4 bg-white/90 w-full max-w-md mx-auto shadow-sm">
          {isGenerating ? (
            <div className="flex items-center justify-center h-36 sm:h-64">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-[hsl(var(--lp-primary))]"></div>
            </div>
          ) : generatedImage ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-md shadow-md bg-white">
                <img 
                  src={generatedImage} 
                  alt="QR kod na predlošku" 
                  className="w-full h-auto max-h-[80vh]"
                />
              </div>
              <Button
                onClick={handleDownload}
                className="mt-3 sm:mt-4 w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-2"
                variant="default"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloaded') || 'Preuzeto'}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloadTemplate') || 'Preuzmi predložak'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 sm:h-64 text-[hsl(var(--lp-muted-foreground))] text-sm sm:text-base">
              {t('admin.dashboard.qr.generatingPreview')}
            </div>
          )}
        </div>
      </div>
      
      {/* Canvas za generiranje slike (skriven) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default QrTemplateSelector;