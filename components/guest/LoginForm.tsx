"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// Definisanje šeme za validaciju forme
const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "Ime mora imati najmanje 2 karaktera",
  }),
  lastName: z.string().min(2, {
    message: "Prezime mora imati najmanje 2 karaktera",
  }),
  email: z.string().email({
    message: "Unesite validnu email adresu",
  }),
})

export function LoginForm() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Inicijalizacija forme sa react-hook-form i zod validacijom
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get('event');

  // Povuci CSRF token na mount
  useEffect(() => {
    fetch("/api/guest/login")
      .then(res => res.json())
      .then(data => {
        setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        setCsrfToken(null);
      });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  })

  // Funkcija koja se poziva prilikom slanja forme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!eventSlug) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nedostaje event identifikator u linku. Kontaktirajte mladence ili proverite link!",
      });
      return;
    }
    try {
      setIsLoading(true)

      const response = await fetch("/api/guest/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({ ...values, eventSlug }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Ako je CSRF token nevažeći, automatski povuci novi token
        if (response.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
          fetch("/api/guest/login")
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken))
            .catch(() => setCsrfToken(null));
          throw new Error("Sesija je istekla ili je došlo do greške sa sigurnosnim tokenom. Pokušajte ponovo.");
        }
        throw new Error(data.error || "Došlo je do greške")
      }

      // Sada će korisnik uvijek biti automatski verifikovan
      toast({
        title: "Uspješna prijava",
        description: "Preusmjeravamo vas na dashboard.",
      })
      
      // Direktno preusmeri na dashboard sa eventSlug parametrom
      window.location.href = `/guest/dashboard?event=${eventSlug}`
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Greška",
        description: error instanceof Error ? error.message : "Došlo je do greške prilikom prijave",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white border border-[hsl(var(--lp-accent))]/30 rounded-xl shadow-md px-6 py-8">
      <CardHeader>
        <CardTitle className="text-center text-[hsl(var(--lp-primary))] text-2xl font-bold mb-2">Prijava</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ime</FormLabel>
                  <FormControl>
                    <Input placeholder="Unesite vaše ime" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezime</FormLabel>
                  <FormControl>
                    <Input placeholder="Unesite vaše prezime" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vasa.adresa@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || !csrfToken}>
              {isLoading ? "Slanje..." : "Prijavi se"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
