import React from "react";

interface Guest {
  images: { imageUrl: string }[];
}

interface DashboardAnalyticsProps {
  guests: Guest[];
}

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ guests }) => {
  const totalGuests = guests.length;
  const guestsWithImages = guests.filter((g: any) => g.images.length > 0).length;
  const totalImages = guests.reduce((acc: number, g: any) => acc + g.images.length, 0);
  const avgImagesPerGuest = totalGuests > 0 ? (totalImages / totalGuests).toFixed(2) : '0';
  const guestsWithMessage = guests.filter((g: any) => g.message && g.message.text && g.message.text.trim() !== '').length;
  const topGuest = guests.length === 0 ? null : guests.reduce((prev: any, curr: any) => (curr.images.length > prev.images.length ? curr : prev), guests[0]);
  const topGuestName = topGuest && topGuest.images.length > 0 ? `${topGuest.firstName} ${topGuest.lastName}` : 'Nema podataka';

  return (
    <div className="rounded-lg border border-[hsl(var(--lp-accent))]/20 p-8 bg-white/70 flex flex-col items-center gap-6">
      <h3 className="text-2xl font-bold text-[hsl(var(--lp-primary))] mb-2 flex items-center gap-2">
        <span className="text-3xl" role="img" aria-label="Statistika">📊</span> Statistika vaše proslave
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Ukupan broj gostiju */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Gosti">👥</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{totalGuests}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Ukupno gostiju</span>
        </div>
        {/* Gostiju sa slikama */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Slike">📷</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{guestsWithImages}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Gostiju uploadovalo slike</span>
        </div>
        {/* Ukupno slika */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Ukupno slika">🖼️</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{totalImages}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Ukupno slika</span>
        </div>
        {/* Prosek slika po gostu */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Statistika">📊</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{avgImagesPerGuest}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Prosječno slika po gostu</span>
        </div>
        {/* Gostiju sa porukom */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Poruke">💌</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{guestsWithMessage}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Gostiju sa porukom</span>
        </div>
        {/* Najaktivniji gost */}
        <div className="flex flex-col items-center bg-[hsl(var(--lp-muted))]/30 rounded-lg p-4 shadow-sm border border-[hsl(var(--lp-accent))]/20">
          <span className="text-3xl" role="img" aria-label="Najaktivniji gost">🏆</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-primary))] mt-1">{topGuestName}</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Najviše slika</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;
