"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// Definisanje šeme za validaciju forme
const formSchema = z.object({
  code: z.string().length(6, {
    message: "Verifikacioni kod mora imati 6 cifara",
  }),
})

export function VerificationForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Inicijalizacija forme sa react-hook-form i zod validacijom
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
    },
  })

  // Funkcija koja se poziva prilikom slanja forme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)

      // Dobavljanje email-a iz localStorage-a
      const email = localStorage.getItem('pendingEmail')
      
      if (!email) {
        throw new Error("Sesija je istekla. Molimo vas da se ponovo prijavite.")
      }

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: values.code,
          email: email
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške")
      }

      // Ukloni privremeni email
      localStorage.removeItem('pendingEmail')

      // Preusmeravanje na dashboard sa gostovim ID-em kao parametrom
      window.location.href = `/dashboard?guestId=${data.guestId}`
    } catch (error) {
      console.error("Verification error:", error)
      const errorMessage = error instanceof Error ? error.message : "Došlo je do greške prilikom verifikacije"
      setError(errorMessage)

      toast({
        variant: "destructive",
        title: "Greška",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verifikacioni kod</FormLabel>
              <FormControl>
                <Input
                  placeholder="Unesite 6-cifreni kod"
                  {...field}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
            {error.includes("Sesija je istekla") && (
              <div className="mt-2">
                <Link href="/" className="underline font-medium">
                  Vratite se na prijavu
                </Link>
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Verifikacija..." : "Verifikuj"}
        </Button>
      </form>
    </Form>
  )
}
