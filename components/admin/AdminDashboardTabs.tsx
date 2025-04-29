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

  // Pravi URL za goste
  const guestUrl = event?.slug ? `https://www.mojasvadbaa.com/guest/login?event=${event.slug}` : '';

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
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <>
      {/* QR i link sekcija za goste */}
      {event?.slug && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 mb-8 bg-yellow-50 rounded-lg shadow border">
          <div ref={qrRef} className="flex flex-col items-center">
            <QRCodeCanvas value={guestUrl} size={120} bgColor="#fffbe7" fgColor="#e3a008" includeMargin={true} />
            <button
              onClick={handleDownload}
              className="mt-2 flex items-center gap-2 px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold transition"
              title="Preuzmi QR kod"
            >
              <Download className="w-4 h-4" /> Preuzmi QR
            </button>
            <span className="mt-2 text-xs text-gray-500 text-center max-w-[150px]">QR kod vodi na: <br/><span className="break-all">{guestUrl}</span></span>
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-semibold text-gray-700 text-sm">Link za goste:</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-white border text-xs font-mono select-all break-all max-w-[220px] md:max-w-xs truncate" title={guestUrl}>{guestUrl}</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2 py-1 rounded ${copied ? 'bg-green-500 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'} text-xs font-semibold transition`}
                title="Kopiraj link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Kopirano!' : 'Kopiraj'}
              </button>
            </div>
            <span className="text-xs text-gray-500">QR kod i link vode goste na stranicu za upload slika za ovaj događaj.</span>
          </div>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
      <TabsList
        className="overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-1 md:gap-2 px-1 sticky top-0 bg-white/90 z-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <TabsTrigger value="guests" className="min-w-[90px] px-2 py-1 text-xs md:text-sm">Gosti</TabsTrigger>
        <TabsTrigger value="analytics" className="min-w-[90px] px-2 py-1 text-xs md:text-sm">Statistika</TabsTrigger>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guests.map((guest: any) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
            </div>
          )}
        </> 
      </TabsContent>
      <TabsContent value="analytics">
        <DashboardAnalytics guests={guests} />
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
