"use client";

import { useTranslation } from "react-i18next";
import { predefinedColors } from "./templates";

interface ColorPickerProps {
  qrColor: string;
  onColorChange: (color: string) => void;
}

export default function ColorPicker({ qrColor, onColorChange }: ColorPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 sm:mb-4">
      <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.chooseColor')}</h4>
      <div className="flex flex-wrap gap-2">
        {predefinedColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => qrColor !== color && onColorChange(color)}
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
            onChange={(e) => onColorChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
            title={t('admin.dashboard.qr.customColor')}
          />
        </div>
      </div>
    </div>
  );
}
