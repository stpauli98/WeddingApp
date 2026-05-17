"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Props {
  currentOverrideDays?: number;
  pricingTier?: string;
}

const DAYS_PER_PURCHASE = 30;
const MAX_OVERRIDE_DAYS = 365;
const PRICE_EUR = 15;

export function ExtendRetentionButton({ currentOverrideDays = 0, pricingTier }: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/admin/events/extend-retention")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

  async function extend() {
    if (!csrfToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/events/extend-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        // Note: setBusy(false) intentionally NOT called here — keep button
        // disabled while the navigation is in flight. If the redirect fails
        // (rare), the user can refresh; an always-true busy state on the
        // happy path is safer than a flicker back to enabled before nav.
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error(data.error || t('admin.retention.error'));
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t('admin.retention.error'),
        description: err instanceof Error ? err.message : t('admin.retention.unknownError'),
      });
      setBusy(false);
    }
  }

  const isFree = pricingTier === "free";
  const isAtCap = currentOverrideDays + DAYS_PER_PURCHASE > MAX_OVERRIDE_DAYS;

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        {t('admin.retention.currentStorage')} <strong>+{currentOverrideDays} dana</strong>
        {isAtCap && ` ${t('admin.retention.maxDays', { max: MAX_OVERRIDE_DAYS })}`}
      </div>
      {isFree ? (
        <div className="text-sm text-amber-700">
          {t('admin.retention.upgradePlanFirst')}{" "}
          <a href="/admin/upgrade" className="underline">{t('admin.retention.upgradeLink')}</a>
        </div>
      ) : (
        <Button onClick={extend} disabled={busy || isAtCap || !csrfToken}>
          {busy ? t('admin.retention.loading') : t('admin.retention.extendButton', { days: DAYS_PER_PURCHASE, price: PRICE_EUR })}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {t('admin.retention.refundNote')}
      </p>
    </div>
  );
}
