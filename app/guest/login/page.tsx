import { Suspense } from "react";
import { GuestLoginClient } from "@/components/guest/GuestLoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container max-w-md mx-auto px-4 py-8">Učitavanje...</div>}>
      <GuestLoginClient />
    </Suspense>
  );
}

