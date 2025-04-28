import { Suspense } from "react";
import { LoginForm } from "@/components/guest/LoginForm";

import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  // SSR/Next 14: fallback na useSearchParams ako je na clientu
  let eventSlug: string | null = null;
  if (typeof window !== "undefined") {
    eventSlug = searchParams?.get("event") || null;
  }

  // Na serveru NIKADA ne prikazuj error, već samo loader/prazan div
  if (typeof window === "undefined") {
    return <div className="container max-w-md mx-auto px-4 py-8" />;
  }

  // DEBUG prikaz vrednosti eventSlug na clientu
  if (typeof window !== "undefined") {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <div style={{ background: "#fffae6", color: "#b45309", padding: 8, borderRadius: 8, marginBottom: 16 }}>
          <b>DEBUG:</b> eventSlug = {String(eventSlug)}
        </div>
        {!eventSlug ? (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-red-600">Nedozvoljen pristup</h1>
            <p className="mt-4">Za pristup login stranici morate koristiti validan link sa QR koda ili pozivnicu od admina (event nije kreiran ili link nije ispravan).</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8"></div>
            <Suspense>
              <LoginForm />
            </Suspense>
          </>
        )}
      </div>
    );
  }

  // Fallback (ne bi trebalo da se desi)
  return null;
}

