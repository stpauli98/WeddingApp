"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react";
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

      // Provjera da li je korisnik već verifikovan
      if (data.verified) {
        toast({
          title: "Uspješna prijava",
          description: "Već ste verifikovani, preusmjeravamo vas na dashboard.",
        })
        
        // Direktno preusmeri na dashboard, guestId se više ne koristi u URL-u
        window.location.href = "/guest/dashboard"
      } else {
        // Ako nije verifikovan, sačuvaj email i vreme isteka koda za verifikaciju i preusmeri na stranicu za verifikaciju
        localStorage.setItem('pendingEmail', data.email)
        if (data.codeExpires) {
          localStorage.setItem('codeExpires', data.codeExpires)
        }
        toast({
          title: "Verifikacija potrebna",
          description: "Niste završili verifikaciju. Novi kod je poslat na vaš email.",
        });
        router.push("/guest/verify")
      }
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
    <Card className="bg-white border-2 border-[#E2C275] rounded-xl shadow px-6 py-8">
      <CardHeader>
        <CardTitle className="text-center text-[#E2C275] text-2xl font-serif font-bold mb-2">Prijava</CardTitle>
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
            <Button type="submit" className="w-full" disabled={isLoading ||
              !csrfToken}>
              {isLoading ? "Prijava..." : "Prijavi se"}
            </Button>
            <div className="relative py-2 flex items-center justify-center">
              <span className="bg-white px-2 text-gray-400 text-xs z-10">ili</span>
              <span className="absolute left-0 right-0 top-1/2 border-t border-gray-200 -z-0"></span>
            </div>
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white border text-gray-700 hover:bg-gray-50"
              variant="outline"
              onClick={() => signIn('google', { callbackUrl: '/guest/dashboard' })}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.18 3.6l6.85-6.85C36.1 2.68 30.53 0 24 0 14.85 0 6.73 5.8 2.69 14.09l7.98 6.2C12.11 13.19 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.21-.42-4.73H24v9.01h12.48c-.54 2.9-2.18 5.36-4.66 7.01l7.25 5.64C43.58 37.93 46.1 31.82 46.1 24.55z"/><path fill="#FBBC05" d="M9.67 28.13A14.5 14.5 0 0 1 9.5 24c0-1.43.24-2.82.67-4.13l-7.98-6.2A23.93 23.93 0 0 0 0 24c0 3.77.9 7.33 2.69 10.33l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.53 0 12.1-2.17 16.12-5.93l-7.25-5.64c-2.01 1.35-4.59 2.16-8.87 2.16-6.38 0-11.89-3.69-13.33-8.89l-7.98 6.2C6.73 42.2 14.85 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              Prijavi se Google nalogom
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
