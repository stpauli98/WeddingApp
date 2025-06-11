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
  onQrColorChange?: (color: string) => void;
}

// List of available templates (we can easily add new ones)
const templates: TemplateOption[] = [
  {
    id: 'template1',
    name: 'template1', // ključ za prijevod
    imageSrc: '/templates/wedding-template-1.jpg',
    qrPosition: { x: 50, y: 86, width: 35, height: 25 }
  },
  {
    id: 'template2',
    name: 'template2', // ključ za prijevod
    imageSrc: '/templates/wedding-template-2.jpg',
    qrPosition: { x: 49, y: 52, width: 45, height: 33 }
  },
  {
    id: 'template3',
    name: 'template3', // ključ za prijevod
    imageSrc: '/templates/wedding-template-3.jpg',
    qrPosition: { x: 49, y: 27, width: 35, height: 23 }
  },
  {
    id: 'template4',
    name: 'template4', // ključ za prijevod
    imageSrc: '/templates/wedding-template-4.jpg',
    qrPosition: { x: 49, y: 45, width: 35, height: 23 }
  },
];

// Predefinisane boje za QR kod
const predefinedColors = [
  "#000000", // Crna
  "#0047AB", // Kobalt plava
  "#6B8E23", // Maslinasto zelena
  "#800020", // Bordo
  "#4B0082", // Indigo
  "#228B22", // Šumsko zelena
  "#8B4513", // Smeđa
  "#4682B4", // Čelik plava
  "#708090", // Slate siva
  "#CD5C5C", // Indijski crvena
];

// Helper to get the initial template (first in the list)
const getInitialTemplate = () => templates[0];

const QrTemplateSelector: React.FC<QrTemplateSelectorProps> = ({ qrValue, qrColor, eventSlug, onQrColorChange }) => {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const currentLanguage = getCurrentLanguageFromPath(pathname);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const templateImageRef = useRef<HTMLImageElement | null>(null);
  
  // State for the selected template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(getInitialTemplate);

  // Postavljanje jezika na osnovu URL-a
  useEffect(() => {
    if (currentLanguage && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  // Construct the path to the template image
  const templatePath = selectedTemplate.imageSrc;

  // Generate QR code on the template
  const generateQrOnTemplate = async () => {
    if (!qrRef.current || !canvasRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Get QR code as an image
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
      // Tiha greška pri generiranju QR koda na predlošku
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
        templateImageRef.current = img;
        generateQrOnTemplate();
      };
      img.onerror = () => {
        // Tiha greška pri učitavanju slike predloška
      };
      
      // Koristimo apsolutnu putanju bez jezičkog prefiksa
      // Next.js aplikacija s višejezičnom podrškom može imati putanje s prefiksima /sr/ ili /en/
      // ali slike u public direktoriju su dostupne direktno iz korijena
      const imagePath = templatePath;
      img.src = imagePath;
    };
    
    loadTemplateImage();
  }, [templatePath, generateQrOnTemplate]);

  // Trigger regeneracije kada promijenimo predložak ili boju QR-a
  useEffect(() => {
    if (templateImageRef.current) generateQrOnTemplate();
  }, [selectedTemplate, qrColor, generateQrOnTemplate]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-1 sm:px-0 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto">
      {/* Skriveni QR kod za generiranje */}
      <div className="hidden" ref={qrRef}>
        <QRCodeCanvas value={qrValue} size={500} bgColor="#FFFFFF" fgColor={qrColor} />
      </div>
      
      {/* Paleta boja za QR kod */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.chooseColor')}</h4>
        <div className="flex flex-wrap gap-2">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => qrColor !== color && onQrColorChange?.(color)}
              className={`w-6 h-6 rounded-full border ${qrColor === color ? 'ring-2 ring-[hsl(var(--lp-primary))] border-[hsl(var(--lp-primary))]' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`${t('admin.dashboard.qr.selectColor')} ${color}`}
            />
          ))}
          <div className="flex items-center">
            <input
              type="color"
              value={qrColor}
              onChange={(e) => onQrColorChange?.(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer"
              title={t('admin.dashboard.qr.customColor')}
            />
          </div>
        </div>
      </div>
      
      {/* Odabir predloška (samo thumbnails) */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.templateSelection')}</h4>
        <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1 snap-x snap-mandatory">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex flex-col items-center shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setSelectedTemplate(tpl)}
                className={`border rounded-md overflow-hidden w-24 h-36 sm:w-28 sm:h-40 flex-none shadow-sm ${selectedTemplate.id === tpl.id ? 'border-[hsl(var(--lp-primary))] ring-2 ring-[hsl(var(--lp-primary))]' : 'border-gray-300 hover:border-[hsl(var(--lp-primary))]'}`}
                title={t(`admin.dashboard.qr.${tpl.name}`)}
              >
                <Image 
                  src={tpl.imageSrc} 
                  alt={t(`admin.dashboard.qr.${tpl.name}`)} 
                  className="object-cover w-full h-full" 
                  width={112} 
                  height={160}
                  priority
                />
              </button>
              <span className="text-xs mt-1 text-center text-gray-700">
                {t(`admin.dashboard.qr.${tpl.name}`)}
              </span>
            </div>
          ))}
        </div>
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
                <Image 
                  src={generatedImage} 
                  alt={t('admin.dashboard.qr.templateAlt')} 
                  className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain"
                  width={500} 
                  height={500}
                  priority
                  unoptimized // Potrebno za data URL slike
                />
              </div>
              <Button
                onClick={handleDownload}
                className="mt-3 sm:mt-4 w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-2 sticky bottom-0 z-10"
                variant="default"
                size="sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloaded')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t('admin.dashboard.qr.downloadTemplate')}
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