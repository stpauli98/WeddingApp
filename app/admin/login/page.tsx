"use client";

import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const router = useRouter();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>Unesite podatke za pristup admin panelu</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded bg-red-100 text-red-700 px-3 py-2 text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gmail.com"
                autoComplete="username"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Lozinka</Label>
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
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
            <Button className="w-full" type="submit" disabled={loading || !csrfToken}>
              {loading ? "Prijava..." : "Prijavi se"}
            </Button>
            <div className="relative py-2 flex items-center justify-center">
              <span className="bg-white px-2 text-gray-400 text-xs z-10">ili</span>
              <span className="absolute left-0 right-0 top-1/2 border-t border-gray-200 -z-0"></span>
            </div>
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white border text-gray-700 hover:bg-gray-50"
              variant="outline"
              onClick={() => signIn('google', { callbackUrl: '/admin/event' })}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.18 3.6l6.85-6.85C36.1 2.68 30.53 0 24 0 14.85 0 6.73 5.8 2.69 14.09l7.98 6.2C12.11 13.19 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.21-.42-4.73H24v9.01h12.48c-.54 2.9-2.18 5.36-4.66 7.01l7.25 5.64C43.58 37.93 46.1 31.82 46.1 24.55z"/><path fill="#FBBC05" d="M9.67 28.13A14.5 14.5 0 0 1 9.5 24c0-1.43.24-2.82.67-4.13l-7.98-6.2A23.93 23.93 0 0 0 0 24c0 3.77.9 7.33 2.69 10.33l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.53 0 12.1-2.17 16.12-5.93l-7.25-5.64c-2.01 1.35-4.59 2.16-8.87 2.16-6.38 0-11.89-3.69-13.33-8.89l-7.98 6.2C6.73 42.2 14.85 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              Prijavi se Google nalogom
            </Button>
            <div className="text-center text-sm">
              Nemate nalog?{" "}
              <Link href="/admin/register" className="font-medium text-primary hover:underline">
                Registrujte se
              </Link>
            </div>
          </CardFooter>
        </form>
        <Button
          className="w-full mt-4 bg-gray-200 text-gray-900 hover:bg-gray-300"
          variant="outline"
          type="button"
          onClick={() => router.push("/")}
        >
          Nazad na početnu
        </Button>
      </Card>
    </div>
  );
}
