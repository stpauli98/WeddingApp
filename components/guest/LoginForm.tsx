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
import { useTranslation } from "react-i18next"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"

// Definisanje šeme za validaciju forme - biće ažurirano s prijevodima
const createFormSchema = (t: any) => z.object({
  firstName: z.string().min(2, {
    message: t("guest.login.errors.firstNameMin"),
  }),
  lastName: z.string().min(2, {
    message: t("guest.login.errors.lastNameMin"),
  }),
  email: z.string().email({
    message: t("guest.login.errors.invalidEmail"),
  }),
})

export function LoginForm() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useTranslation()

  // Inicijalizacija forme sa react-hook-form i zod validacijom
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get('event');

  // Kreiramo formSchema s prijevodima
  const formSchema = createFormSchema(t);

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
        title: t("common.error"),
        description: t("guest.login.errors.missingEvent"),
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
          throw new Error(t("guest.login.errors.sessionExpired"));
        }
        throw new Error(data.error || t("guest.login.errors.genericError"))
      }

      // Sada će korisnik uvijek biti automatski verifikovan
      toast({
        title: t("guest.login.success.title"),
        description: t("guest.login.success.description"),
      })
      
      // Dohvati trenutni jezik iz URL-a koristeći utility funkciju
      const currentLang = getCurrentLanguageFromPath();
      
      // Direktno preusmeri na dashboard sa eventSlug parametrom i jezičnim prefiksom
      window.location.href = `/${currentLang}/guest/dashboard?event=${eventSlug}`
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("guest.login.errors.genericError"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white border border-[hsl(var(--lp-accent))]/30 rounded-xl shadow-md px-6 py-8">
      <CardHeader>
        <CardTitle className="text-center text-[hsl(var(--lp-primary))] text-2xl font-bold mb-2">
          {t("guest.login.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("guest.login.firstName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("guest.login.firstNamePlaceholder")} {...field} />
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
                  <FormLabel>{t("guest.login.lastName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("guest.login.lastNamePlaceholder")} {...field} />
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
                  <FormLabel>{t("guest.login.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("guest.login.emailPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || !csrfToken}>
              {isLoading ? t("guest.login.loading") : t("guest.login.submitButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
