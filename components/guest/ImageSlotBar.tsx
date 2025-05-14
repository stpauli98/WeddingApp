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
        <span className="text-foreground">Slike</span>
        <span className="text-muted-foreground">{current} / {max}</span>
      </div>
      <div className="w-full h-4 bg-muted rounded-full overflow-hidden border border-primary">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1 text-right">
        {max - current > 0
          ? `Možete dodati još ${max - current} ${max - current === 1 ? 'sliku' : 'slika'}`
          : 'Dostigli ste maksimalan broj slika'}
      </div>
    </div>
  );
}
