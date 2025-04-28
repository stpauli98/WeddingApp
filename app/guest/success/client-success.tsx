"use client"
import { useEffect, useState } from "react"
import { SuccessThankYouCard } from "@/components/guest/SuccessThankYouCard"
import { UserGallery } from "@/components/guest/UserGallery"
import { GuestMessage } from "@/components/guest/GuestMessage"
import { UploadLimitReachedCelebration } from "@/components/guest/UploadLimitReachedCelebration"
import { LogoutButton } from "@/components/shared/LogoutButton"

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScxs3Oxov-W9KYX8nQqk01EZ3tCsRU6ylh6BcoBF5XVncgrRQ/viewform?usp=dialog"

interface Image {
  id: string
  imageUrl: string
  storagePath?: string | null
}

interface Guest {
  id: string
  images: Image[]
  eventId: string
}

interface Props {
  guest: Guest
  coupleName?: string
  message?: { text: string }
}

function getSlikaPadez(n: number) {
  switch (n) {
    case 1:
      return "sliku"
    case 2:
    case 3:
    case 4:
      return "slike"
    default:
      return "slika"
  }
}

export default function ClientSuccess({ guest, coupleName, message }: Props) {
  const [countdown, setCountdown] = useState(10); // 10 sekundi prije preusmeravanja na formu
  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = GOOGLE_FORM_URL;
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="container max-w-md mx-auto px-4 py-8 text-center">
      <SuccessThankYouCard coupleName={coupleName} />
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow px-4 py-6 mb-8">
          <UserGallery
            initialImages={(guest?.images || []).map((img: Image) => ({
              ...img,
              storagePath: img.storagePath === null ? undefined : img.storagePath,
            }))}
            guestId={guest.id}
          />
          {guest.images && guest.images.length < 10 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Možete dodati još <span className="font-semibold">{10 - guest.images.length}</span> {getSlikaPadez(10 - guest.images.length)}.
            </div>
          )}
          <div className="mt-8">
            <GuestMessage message={message} />
          </div>
        </div>
        {guest.images && guest.images.length === 10 && (
          <div className="mb-2">
            <UploadLimitReachedCelebration />
          </div>
        )}
        <div className="my-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 text-blue-900">
            <p className="mb-2 font-semibold">Hvala na doprinosu!</p>
            <p className="mb-2">Za par sekundi bićete prebačeni na kratak formular za povratnu informaciju.</p>
            <p className="mb-4 text-sm">Preusmeravanje za: <span className="font-mono font-bold">{countdown}</span> sekundi...</p>
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
            >
              Otvori formular odmah
            </a>
          </div>
        </div>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
