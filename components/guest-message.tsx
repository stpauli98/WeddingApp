"use client"

import { Card } from "@/components/ui/card"

interface Message {
  text: string
}

interface GuestMessageProps {
  message: Message | null | undefined
}

export function GuestMessage({ message }: GuestMessageProps) {
  if (!message) {
    return null
  }

  return (
    <div className="mt-6 bg-muted/50 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2">Vaša poruka:</h3>
      <p className="text-muted-foreground italic">
        "{message.text}"
      </p>
    </div>
  )
}
