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
    <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl shadow px-6 py-4">
      <div className="mb-2">
        <span className="block text-center text-gray-700 text-base font-medium">Vaša poruka mladencima</span>
      </div>
      <p className="text-gray-600 text-base whitespace-pre-line text-center">{message.text}</p>
    </div>
  );
}
