"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tier = "free" | "basic" | "premium" | "unlimited";

const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

const PLAN_LABELS: Record<Tier, string> = {
  free: "Besplatno",
  basic: "Basic",
  premium: "Premium",
  unlimited: "Unlimited",
};

const FULL_PRICES: Record<Tier, number> = {
  free: 0,
  basic: 1999,
  premium: 3999,
  unlimited: 5999,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  netPaidCents: number;
}

export function UpgradePlanModal({ open, onOpenChange, currentTier, netPaidCents }: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments/checkout")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setCsrfToken(null));
  }, [open]);

  const options = (Object.keys(PLAN_LABELS) as Tier[])
    .filter((t) => TIER_ORDER[t] > TIER_ORDER[currentTier])
    .map((t) => ({
      tier: t,
      label: PLAN_LABELS[t],
      fullPriceCents: FULL_PRICES[t],
      deltaCents: Math.max(0, FULL_PRICES[t] - netPaidCents),
    }));

  async function buy(tier: Tier) {
    if (!csrfToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ targetTier: tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Greška",
          description: data.error || "Pokušaj ponovo",
        });
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({
        variant: "destructive",
        title: "Mrežna greška",
        description: "Provjeri konekciju",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade plan</DialogTitle>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Imaš najviši plan. ✨</p>
        ) : (
          <ul className="space-y-3">
            {options.map((opt) => (
              <li
                key={opt.tier}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {(opt.fullPriceCents / 100).toFixed(2)} EUR
                    {opt.deltaCents !== opt.fullPriceCents && (
                      <span className="ml-2 text-xs">
                        (razlika: {(opt.deltaCents / 100).toFixed(2)} EUR)
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={busy || !csrfToken}
                  onClick={() => buy(opt.tier)}
                >
                  Plati {(opt.deltaCents / 100).toFixed(2)} EUR
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
