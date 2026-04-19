"use client"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { SuccessThankYouCard } from "@/components/guest/SuccessThankYouCard"
import { UserGallery } from "@/components/guest/UserGallery"
import { GuestMessage } from "@/components/guest/GuestMessage"
import { UploadLimitReachedCelebration } from "@/components/guest/UploadLimitReachedCelebration"
import { LogoutButton } from "@/components/shared/LogoutButton"

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
  eventSlug?: string
  language?: string
  imageLimit?: number
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

export default function ClientSuccess({ guest, coupleName, message, eventSlug, language = 'sr', imageLimit = 10 }: Props) {
  const { t, i18n } = useTranslation();

  // Postavi jezik ako je različit od trenutnog
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <div className="container max-w-md mx-auto px-4 py-8 text-center">
      <SuccessThankYouCard coupleName={coupleName} language={language} />
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-[hsl(var(--lp-accent))]/30 rounded-xl shadow-md px-4 py-6 mb-8">
          <UserGallery
            initialImages={(guest?.images || []).map((img: Image) => ({
              ...img,
              storagePath: img.storagePath === null ? undefined : img.storagePath,
            }))}
            guestId={guest.id}
            eventSlug={eventSlug}
            language={language}
            imageLimit={imageLimit}
          />
          {guest.images && guest.images.length < imageLimit && (
            <div className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
              {t('guest.imageSlotBar.canAddMore', 'Možete dodati još {{count}} {{imageText}}', {
                count: imageLimit - guest.images.length,
                imageText: getSlikaPadez(imageLimit - guest.images.length)
              })}
            </div>
          )}

          <div className="mt-8">
            <GuestMessage message={message} />
          </div>
        </div>
        {guest.images && guest.images.length >= imageLimit && (
          <div className="mb-2">
            <UploadLimitReachedCelebration
              imagesCount={guest.images.length}
              language={language}
              imageLimit={imageLimit}
            />
          </div>
        )}
        <div className="mt-8">
          <LogoutButton
            language={language}
            eventSlug={eventSlug}
          />
        </div>
      </div>
    </div>
  );
}
