"use client";
import { LoginForm } from "@/components/guest/LoginForm";
import { useSearchParams } from "next/navigation";

export function GuestLoginClient() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event");

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      {!eventSlug ? (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-600">Nedozvoljen pristup</h1>
          <p className="mt-4">Za pristup login stranici morate koristiti validan link sa QR koda ili pozivnicu od admina (event nije kreiran ili link nije ispravan).</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-8"></div>
          <LoginForm />
        </>
      )}
    </div>
  );
}
