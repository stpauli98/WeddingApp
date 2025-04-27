// "use client" je neophodan jer koristimo window i useEffect
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Resetuj history stack kada admin dođe na dashboard ili podstranice
    // Ovim pushujemo "dummy" state, pa sprečavamo povratak na login/register/event
    window.history.pushState(null, "", window.location.pathname);
    const handlePopState = (e: PopStateEvent) => {
      // Ako korisnik pokuša da ide nazad, vratimo ga na dashboard i ostavimo ga tu
      router.replace("/admin/dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router, pathname]);

  return <>{children}</>;
}
