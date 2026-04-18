"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  currentOverrideDays?: number;
}

const PRESET_DAYS = [7, 30, 90, 180];

export function ExtendRetentionButton({ currentOverrideDays = 0 }: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overrideDays, setOverrideDays] = useState(currentOverrideDays);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/events/extend-retention")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

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
        {PRESET_DAYS.map((d) => (
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
