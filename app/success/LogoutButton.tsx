"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

interface LogoutButtonProps {
  label: string
}

export default function LogoutButton({ label }: LogoutButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" })
    router.push("/")
  }

  return (
    <Button className="w-full" onClick={() => startTransition(handleLogout)} disabled={pending} >
      {pending ? "Odjavljivanje..." : label}
    </Button>
  )
}
