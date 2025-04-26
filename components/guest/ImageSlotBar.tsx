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
        <span className="text-gray-700">Slike</span>
        <span className="text-gray-500">{current} / {max}</span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-[#E2C275]">
        <div
          className="h-full bg-gradient-to-r from-[#E2C275] to-yellow-200 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1 text-right">
        {max - current > 0
          ? `Možete dodati još ${max - current} ${max - current === 1 ? 'sliku' : 'slika'}`
          : 'Dostigli ste maksimalan broj slika'}
      </div>
    </div>
  );
}
