import React from "react";

interface ImageSlotBarProps {
  current: number; // broj uploadovanih slika
  max: number; // maksimalan broj slika
}

/**
 * Elegantna statička progress bar komponenta za prikaz broja preostalih slika.
 * Popunjen deo je zlatan, ostatak je svetlo sivo. Prikazuje i tekstualni status.
 */
export function ImageSlotBar({ current, max }: ImageSlotBarProps) {
  const percent = Math.min(100, Math.round((current / max) * 100));
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between mb-1 text-sm font-medium">
        <span className="text-[hsl(var(--lp-foreground))]">Slike</span>
        <span className="text-[hsl(var(--lp-muted-foreground))]">{current} / {max}</span>
      </div>
      <div className="w-full h-4 bg-[hsl(var(--lp-muted))]/30 rounded-full overflow-hidden border border-[hsl(var(--lp-accent))] relative">
        {/* Dodajemo min-width da progress bar bude vidljiv čak i kad je postotak mali */}
        <div
          className="h-full bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-primary))] to-[hsl(var(--lp-primary-hover))] rounded-full transition-all duration-300 shadow-md"
          style={{ width: `${percent}%`, minWidth: percent > 0 ? '8px' : '0' }}
        >
          {/* Dodajemo sjaj/odsjaj za bolju vidljivost */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
        </div>
        
        {/* Uklonili smo vertikalne markere prema zahtjevu */}
      </div>
      <div className="text-xs text-[hsl(var(--lp-muted-foreground))] mt-1 text-right">
        {max - current > 0
          ? `Možete dodati još ${max - current} ${max - current === 1 ? 'sliku' : 'slika'}`
          : 'Dostigli ste maksimalan broj slika'}
      </div>
    </div>
  );
}
