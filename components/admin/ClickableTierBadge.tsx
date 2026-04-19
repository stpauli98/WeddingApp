"use client";

import { useEffect, useState } from "react";
import { EventTierBadge } from "@/components/admin/EventTierBadge";
import { UpgradePlanModal } from "@/components/admin/UpgradePlanModal";
import type { PricingTier } from "@prisma/client";

interface Props {
  tier: PricingTier;
  imageLimit: number;
  language: "sr" | "en";
  eventId: string;
}

export function ClickableTierBadge({ tier, imageLimit, language, eventId }: Props) {
  const [open, setOpen] = useState(false);
  const [netPaidCents, setNetPaidCents] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/payments/history`)
      .then((r) => r.json())
      .then((d) => {
        const net = (d.payments || [])
          .filter((p: { status: string }) => p.status === "paid" || p.status === "partial")
          .reduce(
            (sum: number, p: { amountCents: number; refundedAmountCents: number }) =>
              sum + (p.amountCents - p.refundedAmountCents),
            0
          );
        setNetPaidCents(net);
      })
      .catch(() => setNetPaidCents(0));
  }, [open, eventId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer transition-opacity hover:opacity-80"
        aria-label="Upgrade plan"
      >
        <EventTierBadge
          tier={tier}
          imageLimit={imageLimit}
          language={language}
          variant="badge"
        />
      </button>
      <UpgradePlanModal
        open={open}
        onOpenChange={setOpen}
        currentTier={tier}
        netPaidCents={netPaidCents}
      />
    </>
  );
}
