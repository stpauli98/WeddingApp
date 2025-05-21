"use client";

import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import I18nProvider from "@/components/I18nProvider";
import LanguageSelector from "@/components/LanguageSelector";

export default function AdminLoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  // Pratimo stanje montiranja komponente za hidrataciju
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/admin/login")
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/admin/dashboard");
      } else {
        // Ako je CSRF token nevažeći, automatski povuci novi token
        if (res.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
          // Povuci novi CSRF token
          fetch("/api/admin/login")
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken))
            .catch(() => setCsrfToken(null));
          setError("Sesija je istekla ili je došlo do greške sa sigurnosnim tokenom. Pokušajte ponovo.");
        } else {
          setError(data.error || "Greška prilikom logovanja.");
        }
      }
    } catch (err) {
      setError("Greška na mreži ili serveru.");
    } finally {
      setLoading(false);
    }
  };

  // Ako komponenta nije montirana, prikazujemo skeleton
  if (!mounted) {
    return (
      <I18nProvider>
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--lp-bg))] px-4 py-12 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md mx-auto shadow-lg bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-card-foreground))]">
            <div className="h-8 bg-[hsl(var(--lp-muted))] rounded mb-6"></div>
            <div className="h-64 bg-[hsl(var(--lp-muted))] rounded"></div>
          </Card>
        </div>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--lp-bg))] px-4 py-12 sm:px-6 lg:px-8 relative">
        <div className="absolute top-4 right-4">
          <LanguageSelector className="backdrop-blur-sm bg-white/50" />
        </div>
        <Card className="w-full max-w-md bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-card-foreground))] shadow-lg border-[hsl(var(--lp-accent))]">
          <CardHeader className="space-y-1 text-center relative pb-6">
            <CardTitle className="text-2xl font-bold text-[hsl(var(--lp-text))]">Admin Login</CardTitle>
            <CardDescription className="text-[hsl(var(--lp-muted-foreground))]">Unesite podatke za pristup admin panelu</CardDescription>
          </CardHeader>
        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded bg-[hsl(var(--lp-destructive))/10] text-[hsl(var(--lp-destructive))] px-3 py-2 text-sm font-medium">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[hsl(var(--lp-text))]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gmail.com"
                autoComplete="username"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[hsl(var(--lp-text))]">Lozinka</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))]"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--lp-accent))] hover:text-[hsl(var(--lp-accent))/80]"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                >
                  {showPassword ? (
                    // Eye with slash (hide)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.217 1.125-4.575m16.875 4.575c0 2.21-.895 4.21-2.343 5.657M15 12a3 3 0 11-6 0 3 3 0 016 0zm-7.071 7.071l14.142-14.142" /></svg>
                  ) : (
                    // Eye open
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c0 5.25-4.5 9-10.5 9S1.5 17.25 1.5 12 6 3 12 3s10.5 3.75 10.5 9z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              className="w-full bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] hover:bg-[hsl(var(--lp-primary))/90] border-none" 
              type="submit" 
              disabled={loading || !csrfToken}
            >
              {loading ? "Prijava..." : "Prijavi se"}
            </Button>
            <div className="text-center text-sm">
              Nemate nalog?{" "}
              <Link href="/admin/register" className="font-medium text-[hsl(var(--lp-accent))] hover:underline">
                Registrujte se
              </Link>
            </div>
          </CardFooter>
        </form>
        <div className="p-6 pt-0">
          <Button
            className="w-full bg-[hsl(var(--lp-muted))] text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-muted))/80] border-none"
            variant="outline"
            type="button"
            onClick={() => router.push("/")}
          >
            Nazad na početnu
          </Button>
        </div>
      </Card>
    </div>
    </I18nProvider>
  );
}
