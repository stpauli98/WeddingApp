"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface LogoutButtonProps {
  label: string
}

export default function LogoutButton({ label }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = () => {
   //brisem session cookie i vrati na pocetnu stranu
   fetch("/api/logout", { method: "POST" })
   router.replace("/")
  };

  return (
    <Button className="w-full" onClick={handleLogout}>
      {label}
    </Button>
  );
}
