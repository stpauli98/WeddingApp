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
    <div className="mb-4 bg-card border border-primary/20 rounded-xl shadow px-6 py-4">
      <div className="mb-2">
        <span className="block text-center text-foreground text-base font-medium">Vaša poruka mladencima</span>
      </div>
      <p className="text-muted-foreground text-base whitespace-pre-line text-center">{message.text}</p>
    </div>
  );
}
