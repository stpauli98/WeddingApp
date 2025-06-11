"use client";
import React, { useState, useEffect, useRef } from "react";
import GuestCard from "./GuestCard";
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminGalleryAllImages from "@/components/admin/AdminGalleryAllImages";
import AdminAllMessages from "@/components/admin/AdminAllMessages";
import AdminHelpContact from "@/components/admin/AdminHelpContact";
import QrTemplateSelector from "@/components/admin/QrTemplateSelector";
import { useTranslation } from "react-i18next";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";

interface AdminDashboardTabsProps {
  guests: any[];
  event: { coupleName: string; slug?: string; language?: string } | null;
}

const TAB_KEYS = ["guests", "analytics", "gallery", "messages", "download", "help"];
const STORAGE_KEY = "adminDashboardActiveTab";

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ guests, event }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // QR COLOR STATE
  // QRCodeCanvas ne može koristiti CSS varijable, pa koristimo direktnu hex vrijednost
  const defaultQrColor = "#000000"; // Crna boja za maksimalnu vidljivost QR koda
  const [qrColor, setQrColor] = useState<string>(defaultQrColor);

  // Pravi URL za goste s prefiksom jezika koristeći utility funkciju
  const guestUrl = event?.slug 
    ? `https://www.dodajuspomenu.com/${getCurrentLanguageFromPath()}/guest/login?event=${event.slug}` 
    : '';

  // Kopiranje URL-a
  const handleCopy = async () => {
    if (!guestUrl) return;
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR kao PNG
  const handleDownload = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-kod-event-${event?.slug || 'wedding'}.png`;
    a.click();
  };

  const [activeTab, setActiveTab] = useState<string>(TAB_KEYS[0]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && TAB_KEYS.includes(stored)) setActiveTab(stored);
    // QR color load
    if (event?.slug && typeof window !== "undefined") {
      const color = localStorage.getItem(`qrColor-${event.slug}`);
      if (color) setQrColor(color);
    }
  }, [event?.slug]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Sačuvaj QR boju kad se promeni
  useEffect(() => {
    if (event?.slug && typeof window !== "undefined") {
      localStorage.setItem(`qrColor-${event.slug}`, qrColor);
    }
  }, [qrColor, event?.slug]);

  return (
    <>
      {/* QR i link sekcija za goste */}
      {event?.slug && (
        <section className="w-full max-w-2xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-6 bg-gradient-to-br from-[hsl(var(--lp-muted))] via-white/70 to-[hsl(var(--lp-muted))] rounded-2xl shadow-lg border border-[hsl(var(--lp-accent))]/30">
            {/* QR Vizuelni blok */}
            <div ref={qrRef} className="flex flex-col items-center justify-center bg-white/90 rounded-xl shadow-md p-4 border border-[hsl(var(--lp-accent))]/20">
              <QRCodeCanvas value={guestUrl} size={148} bgColor="#FFFFFF" fgColor={qrColor} className="rounded-xl shadow-sm" />
              <label className="flex items-center gap-2 mt-2 mb-1 text-xs text-[hsl(var(--lp-muted-foreground))] cursor-pointer" htmlFor="qrColorPicker">
                {t('admin.dashboard.qr.chooseColor')}
                <input
                  id="qrColorPicker"
                  type="color"
                  value={qrColor}
                  onChange={e => setQrColor(e.target.value)}
                  className="w-6 h-6 border rounded cursor-pointer"
                  aria-label={t('admin.dashboard.qr.colorPickerLabel')}
                />
              </label>
              <button
                onClick={handleDownload}
                className="mt-2 flex items-center justify-center gap-2 px-4 py-1.5 rounded-md bg-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-primary-hover))] text-[hsl(var(--lp-primary-foreground))] text-sm font-medium shadow transition-colors"
                title={t('admin.dashboard.qr.downloadButton')}
              >
                <Download className="w-4 h-4" /> {t('admin.dashboard.qr.downloadButton')}
              </button>
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="mt-2 flex items-center justify-center gap-2 px-4 py-1.5 rounded-md bg-white border border-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary))] hover:bg-[hsl(var(--lp-muted))] text-sm font-medium shadow transition-colors"
              >
                {t('admin.dashboard.qr.useTemplate')}
              </button>
              <span className="mt-2 text-xs text-[hsl(var(--lp-muted-foreground))] text-center max-w-[180px]">{t('admin.dashboard.qr.scanQR')}</span>
            </div>
            
            {/* Link + Akcije */}
            <div className="flex flex-col items-start space-y-4 w-full max-w-md">
              <div className="flex flex-col w-full">
                <h3 className="text-lg font-semibold text-[hsl(var(--lp-text))] mb-2">{t('admin.dashboard.qr.scanQR')}</h3>
                <div className="flex items-center w-full overflow-hidden rounded-lg border border-[hsl(var(--lp-accent))]/20 bg-white shadow-sm">
                  <div className="flex-1 truncate px-4 py-2 text-sm text-[hsl(var(--lp-text))]">
                    {guestUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center bg-[hsl(var(--lp-muted))] p-2 text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-muted))]/80 transition"
                    title={t('admin.dashboard.qr.copyButton')}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
                  {t('admin.dashboard.qr.instruction1')}
                </p>
              </div>
              
              <div className="w-full bg-[hsl(var(--lp-muted))]/50 rounded-md p-3 text-xs text-[hsl(var(--lp-text))] flex items-center gap-2 shadow-inner border border-[hsl(var(--lp-accent))]/10">
                <svg className="w-5 h-5 text-[hsl(var(--lp-accent))] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 8v.01" /></svg>
                <span>{t('admin.dashboard.qr.instruction2')}</span>
              </div>
            </div>
          </div>
        </section>
      )}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <TabsList className="flex w-max min-w-full mb-4 bg-[hsl(var(--lp-muted))] p-1.5 rounded-xl border border-[hsl(var(--lp-accent))]/20 shadow-sm">
            <TabsTrigger value="guests" className="flex-shrink-0 min-w-[120px] py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--lp-text))] data-[state=active]:shadow-sm data-[state=active]:border-b-0">
              {t('admin.dashboard.tabs.guests')}
            </TabsTrigger>
            {/* <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--lp-text))] data-[state=active]:shadow-sm">
              {t('admin.dashboard.tabs.analytics')}
            </TabsTrigger> */}
            <TabsTrigger value="gallery" className="flex-shrink-0 min-w-[120px] py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--lp-text))] data-[state=active]:shadow-sm data-[state=active]:border-b-0">
              {t('admin.dashboard.tabs.gallery')}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-shrink-0 min-w-[120px] py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--lp-text))] data-[state=active]:shadow-sm data-[state=active]:border-b-0">
              {t('admin.dashboard.tabs.messages')}
            </TabsTrigger>
            <TabsTrigger value="help" className="flex-shrink-0 min-w-[120px] py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--lp-text))] data-[state=active]:shadow-sm data-[state=active]:border-b-0">
              {t('admin.dashboard.tabs.help')}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="guests">
          {guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--lp-muted-foreground))]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="italic mb-2">{t('admin.dashboard.noGuests')}</div>
              <div className="text-sm text-[hsl(var(--lp-muted-foreground))]">{t('admin.dashboard.noGuestsDescription')}</div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Gosti koji su uploadovali bar jednu sliku */}
              {(() => {
                const guestsWithImages = guests.filter(guest => guest.images && guest.images.length > 0);
                return guestsWithImages.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--lp-accent))] mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('admin.dashboard.guestList.guestsWithPhotos')} ({guestsWithImages.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {guestsWithImages.map((guest: any) => (
                        <GuestCard key={guest.id} guest={guest} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Gosti koji nisu uploadovali nijednu sliku */}
              {(() => {
                const guestsWithoutImages = guests.filter(guest => !guest.images || guest.images.length === 0);
                return guestsWithoutImages.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--lp-muted-foreground))] mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {t('admin.dashboard.guestList.guestsWithoutPhotos')} ({guestsWithoutImages.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {guestsWithoutImages.map((guest: any) => (
                        <GuestCard key={guest.id} guest={guest} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </TabsContent>
      <TabsContent value="gallery">
        <div className="rounded-lg border border-[hsl(var(--lp-accent))]/20 p-6 bg-white/70">
          <AdminGalleryAllImages images={guests.flatMap((g: any) => g.images.map((img: any) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            createdAt: img.createdAt,
            guestName: `${g.firstName} ${g.lastName}`
          })))} />
        </div>
      </TabsContent>
      <TabsContent value="messages">
        <div className="rounded-lg border border-[hsl(var(--lp-accent))]/20 p-6 bg-white/70">
          <AdminAllMessages messages={guests.filter((g: any) => g.message && g.message.text && g.message.text.trim() !== '').map((g: any) => ({
            id: g.message!.id,
            text: g.message!.text,
            guestName: `${g.firstName} ${g.lastName}`,
            createdAt: g.message!.createdAt
          }))} />
        </div>
      </TabsContent>
      <TabsContent value="help">
        <div className="rounded-lg border border-[hsl(var(--lp-accent))]/20 p-6 bg-white/70">
          <AdminHelpContact />
        </div>
      </TabsContent>
    </Tabs>

    {/* Modal za QR predloške */}
    <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-h-[80vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold">{t('admin.dashboard.qr.templateTitle')}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 sm:mt-4 overflow-y-auto">
          <QrTemplateSelector 
            qrValue={guestUrl} 
            qrColor={qrColor} 
            eventSlug={event?.slug || 'wedding'} 
            onQrColorChange={(color) => setQrColor(color)}
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminDashboardTabs;
