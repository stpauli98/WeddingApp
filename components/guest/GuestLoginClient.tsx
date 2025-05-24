"use client";
import { LoginForm } from "@/components/guest/LoginForm";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

export function GuestLoginClient() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event");
  const { t } = useTranslation();

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      {!eventSlug ? (
        <div className="text-center mb-8 p-6 bg-white rounded-xl shadow-md border border-[hsl(var(--lp-destructive))]/30">
          <h1 className="text-2xl font-bold text-[hsl(var(--lp-destructive))]">
            {t("guest.login.accessDenied.title")}
          </h1>
          <p className="mt-4 text-[hsl(var(--lp-text))]">
            {t("guest.login.accessDenied.description")}
          </p>
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
