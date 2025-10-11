import { Suspense } from "react";
import { GuestLoginClient } from "@/components/guest/GuestLoginClient";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-md mx-auto px-4 py-8 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-4 border-[hsl(var(--lp-accent))] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[hsl(var(--lp-muted-foreground))]">Učitavanje...</p>
        </div>
      </div>
    }>
      <GuestLoginClient />
    </Suspense>
  );
}

