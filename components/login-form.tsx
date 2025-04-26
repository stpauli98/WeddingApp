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
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Inicijalizacija forme sa react-hook-form i zod validacijom
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
    try {
      setIsLoading(true)

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Došlo je do greške")
      }

      // Provjera da li je korisnik već verifikovan
      if (data.verified) {
        toast({
          title: "Uspješna prijava",
          description: "Već ste verifikovani, preusmjeravamo vas na dashboard.",
        })
        
        // Direktno preusmeri na dashboard, guestId se više ne koristi u URL-u
        window.location.href = "/dashboard"
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
        router.push("/verify")
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Slanje..." : "Prijavi se"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
