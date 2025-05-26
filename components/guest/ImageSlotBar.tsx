import React from "react";
import { useTranslation } from "react-i18next";

interface ImageSlotBarProps {
  current: number; // broj uploadovanih slika
  max: number; // maksimalan broj slika
  language?: string; // jezik za prijevode
}

/**
 * Elegantna statička progress bar komponenta za prikaz broja preostalih slika.
 * Popunjen deo je zlatan, ostatak je svetlo sivo. Prikazuje i tekstualni status.
 */
export function ImageSlotBar({ current, max, language = 'sr' }: ImageSlotBarProps) {
  const { t, i18n } = useTranslation();
  
  // Postavi jezik ako je različit od trenutnog
  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  
  const percent = Math.min(100, Math.round((current / max) * 100));
  
  // Funkcija za pravilno formatiranje teksta za broj slika na srpskom/engleskom
  const formatImagesText = (count: number) => {
    if (i18n.language === 'en') {
      return count === 1 ? 'image' : 'images';
    }
    
    // Za srpski jezik
    if (count === 1) return 'sliku';
    if (count >= 2 && count <= 4) return 'slike';
    return 'slika';
  };
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between mb-1 text-sm font-medium">
        <span className="text-[hsl(var(--lp-foreground))]">{t('guest.imageSlotBar.images', 'Slike')}</span>
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
          ? t('guest.imageSlotBar.canAddMore', 'Možete dodati još {{count}} {{imageText}}', {
              count: max - current,
              imageText: formatImagesText(max - current)
            })
          : t('guest.imageSlotBar.maxReached', 'Dostigli ste maksimalan broj slika')}
      </div>
    </div>
  );
}
