"use client";
import React, { useState, useEffect, useRef } from "react";
import GuestCard from "./GuestCard";
import DashboardAnalytics from "./DashboardAnalytics";
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminGalleryAllImages from "@/components/admin/AdminGalleryAllImages";
import AdminAllMessages from "@/components/admin/AdminAllMessages";
import AdminDownloadTab from "@/components/admin/AdminDownloadTab";
import AdminHelpContact from "@/components/admin/AdminHelpContact";

interface AdminDashboardTabsProps {
  guests: any[];
  event: { coupleName: string; slug?: string } | null;
}

const TAB_KEYS = ["guests", "analytics", "gallery", "messages", "download", "help"];
const STORAGE_KEY = "adminDashboardActiveTab";

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ guests, event }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // QR COLOR STATE
  const defaultQrColor = "#e3a008";
  const [qrColor, setQrColor] = useState<string>(defaultQrColor);

  // Pravi URL za goste
  const guestUrl = event?.slug ? `https://www.dodajuspomenu.com/guest/login?event=${event.slug}` : '';

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
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-6 bg-gradient-to-br from-yellow-50 via-white/70 to-yellow-100 rounded-2xl shadow-lg border border-yellow-200">
      {/* QR Vizuelni blok */}
      <div ref={qrRef} className="flex flex-col items-center justify-center bg-white/90 rounded-xl shadow-md p-4 border border-yellow-100">
        <QRCodeCanvas value={guestUrl} size={148} bgColor="#fffbe7" fgColor={qrColor} includeMargin={true} className="rounded-xl" />
        <label className="flex items-center gap-2 mt-2 mb-1 text-xs text-gray-700 cursor-pointer" htmlFor="qrColorPicker">
          Izaberi boju QR koda:
          <input
            id="qrColorPicker"
            type="color"
            value={qrColor}
            onChange={e => setQrColor(e.target.value)}
            className="w-6 h-6 border rounded cursor-pointer"
            aria-label="Izbor boje QR koda"
          />
        </label>
        <button
          onClick={handleDownload}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold shadow transition"
          title="Preuzmi QR kod"
        >
          <Download className="w-5 h-5" /> Preuzmi QR kod
        </button>
        <span className="mt-2 text-xs text-gray-500 text-center max-w-[180px]">Skenirajte QR kod za direktan pristup stranici za goste.</span>
      </div>
      {/* Link + Akcije */}
      <div className="flex flex-col items-center md:items-start gap-3 w-full max-w-xs">
        <span className="font-bold text-gray-700 text-base mb-1">Link za goste</span>
        <div className="flex items-center gap-2 w-full">
          <span className="px-3 py-2 rounded-lg bg-white border border-yellow-200 text-xs font-mono select-all break-all max-w-[220px] md:max-w-xs truncate shadow-sm" title={guestUrl}>{guestUrl}</span>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg ${copied ? 'bg-green-500 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'} text-xs font-semibold shadow transition`}
            title="Kopiraj link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Kopirano!' : 'Kopiraj'}
          </button>
        </div>
        <span className="text-xs text-gray-500 mt-1">Podelite ovaj link sa gostima ili ga pošaljite putem pozivnice.</span>
        <div className="mt-3 w-full bg-yellow-100/60 rounded-md p-3 text-xs text-yellow-900 flex items-center gap-2 shadow-inner">
          <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 8v.01" /></svg>
          <span>Gosti mogu koristiti QR kod ili link za brz pristup stranici za upload slika i ostavljanje poruka. Preporučujemo da QR kod odštampate i postavite na vidljivo mesto tokom proslave.</span>
        </div>
      </div>
    </div>
  </section>
)}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
      <TabsList
        className="overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-1 md:gap-2 px-1 sticky top-0 bg-white/90 z-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <TabsTrigger value="guests" className="min-w-[90px] px-2 py-1 text-xs md:text-sm">Gosti</TabsTrigger>
        <TabsTrigger value="gallery" className="min-w-[90px] px-2 py-1 text-xs md:text-sm">Galerija</TabsTrigger>
        <TabsTrigger value="messages" className="min-w-[90px] px-2 py-1 text-xs md:text-sm">Poruke</TabsTrigger>
        <TabsTrigger value="download" className="min-w-[110px] px-2 py-1 text-xs md:text-sm">Preuzimanje</TabsTrigger>
        <TabsTrigger value="help" className="min-w-[80px] px-2 py-1 text-xs md:text-sm">Pomoć</TabsTrigger>
      </TabsList>
      <TabsContent value="guests">
        <>
          {guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
                <path d="M21 19l-5.5-6.5a2 2 0 0 0-3 0L3 19" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              <div className="italic mb-2">Nema prijavljenih gostiju.</div>
              <div className="text-sm text-gray-400">Kada se gosti registruju za ovaj event, ovde će se pojaviti njihovi profili i slike.</div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Gosti koji su uploadovali bar jednu sliku */}
              {(() => {
                const guestsWithImages = guests.filter(guest => guest.images && guest.images.length > 0);
                return guestsWithImages.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-700 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Gosti sa slikama ({guestsWithImages.length})
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
                    <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Gosti bez slika ({guestsWithoutImages.length})
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
        </> 
      </TabsContent>
      <TabsContent value="gallery">
        <div className="rounded-lg border p-6 bg-white/70">
          <AdminGalleryAllImages images={guests.flatMap((g: any) => g.images.map((img: any) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            createdAt: img.createdAt,
            guestName: `${g.firstName} ${g.lastName}`
          })))} />
        </div>
      </TabsContent>
      <TabsContent value="messages">
        <div className="rounded-lg border p-6 bg-white/70">
          <AdminAllMessages messages={guests.filter((g: any) => g.message && g.message.text && g.message.text.trim() !== '').map((g: any) => ({
            id: g.message!.id,
            text: g.message!.text,
            guestName: `${g.firstName} ${g.lastName}`,
            createdAt: g.message!.createdAt
          }))} />
        </div>
      </TabsContent>
      <TabsContent value="download">
        <div className="rounded-lg border p-6 bg-white/70">
          <AdminDownloadTab
            imagesCount={guests.reduce((acc: number, g: any) => acc + g.images.length, 0)}
            messagesCount={guests.filter((g: any) => g.message && g.message.text && g.message.text.trim() !== '').length}
          />
        </div>
      </TabsContent>
      <TabsContent value="help">
        <div className="rounded-lg border p-6 bg-white/70">
          <AdminHelpContact />
        </div>
      </TabsContent>
    </Tabs>
    </>
  );
};

export default AdminDashboardTabs;
