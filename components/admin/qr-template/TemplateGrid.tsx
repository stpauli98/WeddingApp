"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import { TemplateOption } from "./types";

interface TemplateGridProps {
  templates: TemplateOption[];
  selectedId: string;
  onSelect: (template: TemplateOption) => void;
}

export default function TemplateGrid({ templates, selectedId, onSelect }: TemplateGridProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 sm:mb-4">
      <h4 className="text-sm font-medium mb-2">{t('admin.dashboard.qr.templateSelection')}</h4>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1 snap-x snap-mandatory">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex flex-col items-center shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onSelect(tpl)}
              className={`border rounded-md overflow-hidden w-24 h-36 sm:w-28 sm:h-40 flex-none shadow-sm ${selectedId === tpl.id ? 'border-[hsl(var(--lp-primary))] ring-2 ring-[hsl(var(--lp-primary))]' : 'border-gray-300 hover:border-[hsl(var(--lp-primary))]'}`}
              title={t(`admin.dashboard.qr.${tpl.name}`)}
            >
              <Image
                src={tpl.imageSrc}
                alt={t(`admin.dashboard.qr.${tpl.name}`)}
                className="object-cover w-full h-full"
                width={112}
                height={160}
              />
            </button>
            <span className="text-xs mt-1 text-center text-gray-700">
              {t(`admin.dashboard.qr.${tpl.name}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
