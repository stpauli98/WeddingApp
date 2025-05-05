"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function FooterCommentForm() {
  const [comment, setComment] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setStatus("sending")
    try {
      // Simulacija slanja komentara (zamijeniti API endpoint u produkciji)
      await new Promise((r) => setTimeout(r, 1000))
      setStatus("success")
      setComment("")
      setEmail("")
    } catch {
      setStatus("error")
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-3"
      aria-label="Ostavite komentar ili prijedlog"
    >
      <h4 className="text-base font-semibold text-lp-primary mb-0">Imate komentar ili prijedlog?</h4>
      <p className="text-xs text-lp-text/80 mb-1">Vaše mišljenje nam je važno. Sve komentare i prijedloge čitamo i koristimo za poboljšanje aplikacije.</p>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Vaš komentar ili prijedlog..."
        required
        minLength={5}
        className="resize-none"
        aria-label="Komentar ili prijedlog"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Vaš email (opcionalno)"
        type="email"
        className="mt-2"
        aria-label="Email (opcionalno)"
      />
      <Button
        type="submit"
        variant="default"
        disabled={status === "sending" || !comment.trim()}
        className="mt-2"
      >
        {status === "sending" ? "Slanje..." : "Pošalji"}
      </Button>
      {status === "success" && (
        <div className="text-lp-accent text-sm mt-2">Hvala na vašem komentaru! 😊</div>
      )}
      {status === "error" && (
        <div className="text-destructive text-sm mt-2">Došlo je do greške. Pokušajte ponovo.</div>
      )}
    </form>
  )
}
