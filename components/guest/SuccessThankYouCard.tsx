"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SuccessThankYouCardProps {
  coupleName?: string;
}

export function SuccessThankYouCard({ coupleName }: SuccessThankYouCardProps) {
  return (
    <Card className="mb-8 border-[hsl(var(--lp-accent))]/30 shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-[hsl(var(--lp-primary))] text-3xl font-bold tracking-wide">Hvala!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-[hsl(var(--lp-foreground))] text-center mb-2">
          Vaše slike i poruka su uspešno poslate.<br/>
          {coupleName && <span className="text-[hsl(var(--lp-primary))] font-semibold">{coupleName}</span>} će biti oduševljeni vašim iznenađenjem!
        </p>
      </CardContent>
    </Card>
  );
}
