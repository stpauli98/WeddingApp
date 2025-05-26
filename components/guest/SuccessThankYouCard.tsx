"use client";
import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface SuccessThankYouCardProps {
  coupleName?: string;
  language?: string;
}

export function SuccessThankYouCard({ coupleName, language = 'sr' }: SuccessThankYouCardProps) {
  const { t, i18n } = useTranslation();
  
  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  return (
    <Card className="mb-8 border-[hsl(var(--lp-accent))]/30 shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-[hsl(var(--lp-primary))] text-3xl font-bold tracking-wide">
          {t('guest.success.thankYou', 'Hvala!')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-[hsl(var(--lp-foreground))] text-center mb-2">
          {t('guest.success.imagesAndMessageSent', 'Vaše slike i poruka su uspješno poslate.')}<br/>
          {coupleName && (
            <>
              <span className="text-[hsl(var(--lp-primary))] font-semibold">{coupleName}</span> 
              {t('guest.success.coupleWillBeDelighted', ' će biti oduševljeni vašim iznenađenjem!')}
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
