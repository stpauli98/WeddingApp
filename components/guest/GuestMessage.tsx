"use client"

import React from "react";

interface Message {
  text: string
}

interface GuestMessageProps {
  message?: {
    text?: string
  } | null
}

export function GuestMessage({ message }: GuestMessageProps) {
  if (!message?.text) return null;

  return (
    <div className="mb-4 bg-white border border-[hsl(var(--lp-accent))]/30 rounded-xl shadow-md px-6 py-4">
      <div className="mb-2">
        <span className="block text-center text-[hsl(var(--lp-foreground))] text-base font-medium">Vaša poruka mladencima</span>
      </div>
      <p className="text-[hsl(var(--lp-muted-foreground))] text-base whitespace-pre-line text-center">{message.text}</p>
    </div>
  );
}
