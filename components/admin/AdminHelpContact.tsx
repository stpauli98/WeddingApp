"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { getCurrentLanguageFromPath } from "@/lib/utils/language";

const AdminHelpContact: React.FC = () => {
  const { t } = useTranslation();
  
  // Detektiramo jezik iz URL-a za klijentsku komponentu
  const language = typeof window !== 'undefined' ? getCurrentLanguageFromPath() : 'sr';

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-md border border-[hsl(var(--lp-accent))]/20 flex flex-col gap-5">
      <div className="flex items-center gap-4 border-b border-[hsl(var(--lp-accent))]/10 pb-4">
        <div className="bg-gradient-to-br from-[hsl(var(--lp-primary))] to-[hsl(var(--lp-accent))] p-3 rounded-full">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.title")}</h3>
          <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">{t("admin.dashboard.help.subtitle")}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 p-4 bg-[hsl(var(--lp-muted))]/10 rounded-lg border border-[hsl(var(--lp-accent))]/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-[hsl(var(--lp-accent))]/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.gallery.title")}</h4>
          </div>
          <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
            {t("admin.dashboard.help.gallery.description")}
          </p>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--lp-accent))]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t("admin.dashboard.help.gallery.feature")}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 p-4 bg-[hsl(var(--lp-muted))]/10 rounded-lg border border-[hsl(var(--lp-accent))]/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-[hsl(var(--lp-accent))]/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 className="font-semibold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.messages.title")}</h4>
          </div>
          <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
            {t("admin.dashboard.help.messages.description")}
          </p>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--lp-accent))]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t("admin.dashboard.help.messages.feature")}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 p-4 bg-[hsl(var(--lp-muted))]/10 rounded-lg border border-[hsl(var(--lp-accent))]/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-[hsl(var(--lp-accent))]/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h4 className="font-semibold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.qrCode.title")}</h4>
          </div>
          <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
            {t("admin.dashboard.help.qrCode.description")}
          </p>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--lp-accent))]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t("admin.dashboard.help.qrCode.feature")}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 p-4 bg-[hsl(var(--lp-muted))]/10 rounded-lg border border-[hsl(var(--lp-accent))]/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-[hsl(var(--lp-accent))]/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h4 className="font-semibold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.link.title")}</h4>
          </div>
          <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
            {t("admin.dashboard.help.link.description")}
          </p>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--lp-accent))]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t("admin.dashboard.help.link.feature")}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 p-4 bg-gradient-to-r from-[hsl(var(--lp-muted))]/10 to-[hsl(var(--lp-accent))]/10 rounded-lg border border-[hsl(var(--lp-accent))]/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-[hsl(var(--lp-accent))]/20 p-2 rounded-full">
            <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
          <h4 className="font-semibold text-[hsl(var(--lp-text))]">{t("admin.dashboard.help.contact.title")}</h4>
        </div>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))] mb-3">
          {t("admin.dashboard.help.contact.description")}
        </p>
        <a 
          href="mailto:pixelnext9@gmail.com" 
          className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--lp-primary-foreground))] bg-gradient-to-r from-[hsl(var(--lp-primary))] to-[hsl(var(--lp-accent))] px-4 py-2 rounded-lg hover:from-[hsl(var(--lp-primary-hover))] hover:to-[hsl(var(--lp-accent-hover))] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t("admin.dashboard.help.contact.contactButton")}
        </a>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-1">
        <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-[hsl(var(--lp-muted-foreground))]">{t("admin.dashboard.help.security")}</p>
      </div>
    </div>
  );
};

export default AdminHelpContact;
