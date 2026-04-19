"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tier = "free" | "basic" | "premium" | "unlimited";

interface Props {
  currentOverrideDays?: number;
  tier: Tier;
  isGrandfathered?: boolean;
}

const ALL_PRESETS = [7, 30, 90, 180, 365] as const;

const TIER_CAPS: Record<Tier, number> = {
  free: 0,
  basic: 0,
  premium: 180,
  unlimited: 365,
};

export function ExtendRetentionButton({
  currentOverrideDays = 0,
  tier,
  isGrandfathered = false,
}: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overrideDays, setOverrideDays] = useState(currentOverrideDays);
  const { toast } = useToast();

  // Grandfather override: allow all presets regardless of tier cap.
  const maxDays = isGrandfathered ? 365 : TIER_CAPS[tier];
  const presets = ALL_PRESETS.filter((d) => d <= maxDays);

  useEffect(() => {
    if (maxDays === 0) return; // no need to fetch CSRF if panel is disabled
    fetch("/api/admin/events/extend-retention")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setCsrfToken(null));
  }, [maxDays]);

  async function extend(days: number) {
    if (!csrfToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/events/extend-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška");
      setOverrideDays(data.retentionOverrideDays);
      toast({
        title: "Produženo",
        description:
          days === 0
            ? "Dodatni dani uklonjeni — vraćaš se na osnovni plan."
            : `Produženje postavljeno na +${days} dana.`,
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: err instanceof Error ? err.message : "Nepoznata greška",
      });
    } finally {
      setBusy(false);
    }
  }

  if (maxDays === 0) {
    return (
      <div className="space-y-2 opacity-60">
        <h3 className="font-semibold">Produži trajanje podataka</h3>
        <p className="text-sm text-muted-foreground">
          Dostupno od Premium tier-a. Upgrade-uj plan u dashboard badge-u.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">Produži trajanje podataka</h3>
        <p className="text-sm text-muted-foreground">
          Trenutno produženje:{" "}
          <strong>
            {overrideDays === 0 ? "nema dodatnih dana" : `+${overrideDays} dana`}
          </strong>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={overrideDays === d ? "default" : "outline"}
            disabled={busy || !csrfToken}
            onClick={() => extend(d)}
          >
            +{d} dana
          </Button>
        ))}
        {overrideDays > 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !csrfToken}
            onClick={() => extend(0)}
          >
            Ukloni produženje
          </Button>
        )}
      </div>
    </div>
  );
}
