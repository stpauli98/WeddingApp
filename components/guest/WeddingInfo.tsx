import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, MapPinIcon, HeartIcon } from "lucide-react"

// Funkcija za formatiranje datuma
function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return ''
  
  const date = new Date(dateInput)
  
  // Mjeseci na srpskom (latinica)
  const months = [
    'januar', 'februar', 'mart', 'april', 'maj', 'jun',
    'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'
  ]
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  // Formatiranje sati i minuta
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${day}. ${month} ${year}. u ${hours}:${minutes}h`
}

// Funkcija za dobijanje prijevoda
function getTranslation(key: string, language: string): string {
  const translations: Record<string, Record<string, string>> = {
    sr: {
      'guest.weddingInfo.date': 'Datum i vreme',
      'guest.weddingInfo.location': 'Lokacija',
      'guest.weddingInfo.messageForGuests': 'Poruka za goste'
    },
    en: {
      'guest.weddingInfo.date': 'Date and time',
      'guest.weddingInfo.location': 'Location',
      'guest.weddingInfo.messageForGuests': 'Message for guests'
    }
  };
  
  return translations[language]?.[key] || translations['sr'][key];
}

export async function WeddingInfo({ eventId }: { eventId: string }) {
  // Dohvatanje podataka za specifični event
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coupleName: true, location: true, date: true, guestMessage: true },
  });
  
  // Za server komponentu koristimo defaultni jezik
  const language = 'sr';

  return (
    <Card className="mb-8 border-[hsl(var(--lp-accent))]/30 shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-[hsl(var(--lp-primary))]">{event?.coupleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-[hsl(var(--lp-accent))] mt-0.5" />
          <div>
            <h3 className="font-medium">{getTranslation('guest.weddingInfo.date', language)}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(event?.date)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon className="h-5 w-5 text-[hsl(var(--lp-accent))] mt-0.5" />
          <div>
            <h3 className="font-medium">{getTranslation('guest.weddingInfo.location', language)}</h3>
            <p className="text-sm text-muted-foreground">{event?.location}</p>
          </div>
        </div>

        {event?.guestMessage && (
          <div className="flex items-start gap-3">
            <HeartIcon className="h-5 w-5 text-[hsl(var(--lp-accent))] mt-0.5" />
            <div>
              <h3 className="font-medium">{getTranslation('guest.weddingInfo.messageForGuests', language)}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {event.guestMessage}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
