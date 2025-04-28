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

  // Fallback za SSR/Next 14 App Router
  // (Ovo je SSR safe, ali na clientu će biti preciznije)
  if (!eventSlug && typeof window === "undefined") {
    // Next.js 14 serverside: ne prikazuj formu
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-600">Nedozvoljen pristup</h1>
          <p className="mt-4">Za pristup login stranici morate koristiti validan link sa QR koda ili pozivnicu od admina (event nije kreiran ili link nije ispravan).</p>
        </div>
      </div>
    );
  }

  // Client side: proveri parametar
  if (typeof window !== "undefined" && !eventSlug) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-600">Nedozvoljen pristup</h1>
          <p className="mt-4">Za pristup login stranici morate koristiti validan link sa QR koda ili pozivnicu od admina (event nije kreiran ili link nije ispravan).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8"></div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

