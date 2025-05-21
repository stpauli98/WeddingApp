"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

export default function FooterCommentForm() {
  const { t } = useTranslation();
  const [comment, setComment] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setStatus("sending")
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment, email: email || null }),
      })

      if (!response.ok) {
        throw new Error("Greška prilikom slanja komentara")
      }

      setStatus("success")
      setComment("")
      setEmail("")
    } catch (error) {
      console.error("Greška prilikom slanja komentara:", error)
      setStatus("error")
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-3"
      aria-label="Ostavite komentar ili prijedlog"
    >
      <h4 className="text-base font-semibold text-lp-primary mb-0">{t('common.title')}</h4>
      <p className="text-xs text-lp-text/80 mb-1">{t('common.subtitle')}</p>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('common.comment')}
        required
        minLength={5}
        className="resize-none"
        aria-label="Komentar ili prijedlog"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('common.email')}
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
        {status === "sending" ? t('common.loading') : t('common.submit')}
      </Button>
      {status === "success" && (
        <div className="text-lp-accent text-sm mt-2">{t('common.success')}</div>
      )}
      {status === "error" && (
        <div className="text-destructive text-sm mt-2">{t('common.error')}</div>
      )}
    </form>
  )
}
