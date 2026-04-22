"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import I18nProvider from "@/components/I18nProvider"
import LanguageSelector from "@/components/LanguageSelector"

export default function AdminRegisterPage() {
  // Koristimo landing-colors.css stilove za stranicu
  const { t, i18n } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>("");
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Funkcija za provjeru jačine lozinke - memoizirana s useCallback
  const getPasswordStrength = useCallback((pw: string): string => {
    if (!pw) return "";
    if (pw.length < 6) return t('admin.register.weakMinChars');
    let score = 0;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    if (score <= 2) return t('admin.register.weak');
    if (score === 3) return t('admin.register.medium');
    if (score >= 4) return t('admin.register.strong');
    return "";
  }, [t]);

  // Procenat i boja za progress bar
  function getStrengthBarInfo(strength: string): { percent: number; color: string } {
    if (strength === t('admin.register.strong')) {
      return { percent: 100, color: "bg-green-500" };
    } else if (strength === t('admin.register.medium')) {
      return { percent: 66, color: "bg-yellow-500" };
    } else if (strength === t('admin.register.weak') || strength === t('admin.register.weakMinChars')) {
      return { percent: 33, color: "bg-red-500" };
    } else {
      return { percent: 0, color: "bg-[hsl(var(--lp-muted))]" };
    }
  }

  // Pratimo stanje montiranja komponente za hidrataciju
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Real-time feedback
  useEffect(() => {
    setPasswordStrength(getPasswordStrength(password));
    if (!confirmPassword) {
      setPasswordsMatch(null);
    } else {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword, t, getPasswordStrength]);

  useEffect(() => {
    fetch("/api/admin/register")
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError(t('admin.register.errors.allFieldsRequired'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('admin.register.errors.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      // Dodajemo odabrani jezik u podatke za registraciju
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({ 
          email, 
          password, 
          firstName, 
          lastName,
          language: i18n.language // Spremamo odabrani jezik
        }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        // Ako je CSRF token nevažeći, automatski povuci novi token
        if (res.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
          fetch("/api/admin/register")
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken))
            .catch(() => setCsrfToken(null));
          setError(t('admin.register.errors.sessionExpired'));
          return;
        }
        setError(data.error || t('admin.register.errors.networkError'));
        return;
      }
      // T5 generic-response flow: server returns 200 with requiresAction instead of 409
      // to avoid email enumeration. Guide user to login without disclosing whether the
      // email is registered.
      if (data.requiresAction === 'check_existing') {
        setError(t('admin.register.errors.checkExisting'));
        return;
      }
      router.push("/admin/event");
    } catch (err) {
      setError(t('admin.register.errors.networkError'));
    } finally {
      setLoading(false);
    }
  }

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

        {/* Container za banner i card */}
        <div className="w-full max-w-md space-y-4">
          {/* Prominentni Login Banner */}
          <FadeInUp>
            <div className="bg-[hsl(var(--lp-card))] backdrop-blur-sm rounded-lg border border-[hsl(var(--lp-accent))]/40 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--lp-primary))] flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[hsl(var(--lp-primary-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--lp-text))]">
                      {t('admin.register.alreadyHaveAccountPrompt')}
                    </p>
                    <p className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                      {t('admin.register.loginPrompt')}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] hover:bg-[hsl(var(--lp-primary))]/90 w-full sm:w-auto whitespace-nowrap"
                >
                  <Link href="/admin/login">
                    {t('admin.register.login')}
                  </Link>
                </Button>
              </div>
            </div>
          </FadeInUp>

          {/* Postojeća registraciona Card */}
          <FadeInUp delay={0.1}>
          <Card className="bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-card-foreground))] shadow-lg border-[hsl(var(--lp-border))]">
          <CardHeader className="space-y-2 text-center relative pb-6 pt-8">
            <span className="inline-block text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--lp-accent))]">
              {t('admin.register.eyebrow', 'Admin')}
            </span>
            <CardTitle className="font-playfair text-3xl sm:text-4xl font-bold text-[hsl(var(--lp-text))]">{t('admin.register.title')}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[hsl(var(--lp-text))]">{t('admin.register.firstName')}</Label>
                  <Input id="firstName" placeholder="Marko" required value={firstName} onChange={e => setFirstName(e.target.value)} 
                    className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[hsl(var(--lp-text))]">{t('admin.register.lastName')}</Label>
                  <Input id="lastName" placeholder="Marković" required value={lastName} onChange={e => setLastName(e.target.value)} 
                    className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[hsl(var(--lp-text))]">{t('admin.register.email')}</Label>
                <Input id="email" type="email" placeholder="admin@gmail.com" required value={email} onChange={e => setEmail(e.target.value)} 
                  className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[hsl(var(--lp-text))]">{t('admin.register.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))] input-autofill-fix"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--lp-accent))] hover:text-[hsl(var(--lp-accent))]/80"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('admin.register.hidePassword') : t('admin.register.showPassword')}
                  >
                    {showPassword ? (
                      // Eye open (password is visible)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c0 5.25-4.5 9-10.5 9S1.5 17.25 1.5 12 6 3 12 3s10.5 3.75 10.5 9z" /></svg>
                    ) : (
                      // Eye with slash (password is hidden)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.217 1.125-4.575m16.875 4.575c0 2.21-.895 4.21-2.343 5.657M15 12a3 3 0 11-6 0 3 3 0 016 0zm-7.071 7.071l14.142-14.142" /></svg>
                    )}
                  </button>
                </div>
                {/* Progress bar jačine lozinke */}
                {password && (
                  <div className="w-full pt-2">
                    <div className="w-full h-2 rounded bg-[hsl(var(--lp-muted))]">
                      <div
                        className={`h-2 rounded transition-all duration-300 ${getStrengthBarInfo(passwordStrength).color}`}
                        style={{ width: `${getStrengthBarInfo(passwordStrength).percent}%` }}
                      />
                    </div>
                    <div className={
                      passwordStrength === t('admin.register.strong') ? "text-green-600 text-xs pt-1" :
                      passwordStrength === t('admin.register.medium') ? "text-yellow-600 text-xs pt-1" :
                      "text-red-600 text-xs pt-1"
                    }>
                      {t('admin.register.passwordStrength')}: {passwordStrength}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[hsl(var(--lp-text))]">{t('admin.register.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="border-[hsl(var(--lp-accent))] focus:ring-[hsl(var(--lp-accent))] focus-visible:ring-[hsl(var(--lp-accent))] input-autofill-fix"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--lp-accent))] hover:text-[hsl(var(--lp-accent))]/80"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? t('admin.register.hidePassword') : t('admin.register.showPassword')}
                  >
                    {showConfirmPassword ? (
                      // Eye open (password is visible)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm7.5 0c0 5.25-4.5 9-10.5 9S1.5 17.25 1.5 12 6 3 12 3s10.5 3.75 10.5 9z" /></svg>
                    ) : (
                      // Eye with slash (password is hidden)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.217 1.125-4.575m16.875 4.575c0 2.21-.895 4.21-2.343 5.657M15 12a3 3 0 11-6 0 3 3 0 016 0zm-7.071 7.071l14.142-14.142" /></svg>
                    )}
                  </button>
                </div>
                {/* Indikator poklapanja lozinki */}
                {passwordsMatch !== null && (
                  <div className={
                    passwordsMatch ? "text-green-600 text-xs pt-1" : "text-red-600 text-xs pt-1"
                  }>
                    {passwordsMatch ? t('admin.register.passwordsMatch') : t('admin.register.passwordsDontMatch')}
                  </div>
                )}
              </div>
              {error && (
                <div role="alert" className="rounded-md border border-[hsl(var(--lp-destructive))]/30 bg-[hsl(var(--lp-destructive))]/10 px-3 py-2 text-sm font-medium text-[hsl(var(--lp-destructive))]">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--lp-primary))]/90 hover:shadow-md disabled:bg-[hsl(var(--lp-muted))] disabled:text-[hsl(var(--lp-muted-foreground))] border-none" type="submit" disabled={loading || !csrfToken}>
                {loading ? t('admin.register.loading') : t('admin.register.registerButton')}
              </Button>
            </CardFooter>
          </form>
        </Card>
          </FadeInUp>
        </div>
      </div>
    </I18nProvider>
  );
}
