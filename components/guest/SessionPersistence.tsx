"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SessionPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Provjeri postoji li guestId i eventSlug u localStorage
    const guestId = localStorage.getItem("guestId");
    const eventSlug = localStorage.getItem("eventSlug");
    if (guestId && eventSlug && window.location.pathname !== "/guest/dashboard") {
      router.replace(`/guest/dashboard?event=${eventSlug}`);
    }
  }, [router, searchParams]);

  return null;
}
