import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, MapPinIcon, HeartIcon } from "lucide-react"

// Funkcija za formatiranje datuma
function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return ''
  
  const date = new Date(dateInput)
  
  // Meseci na srpskom (latinica)
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

export async function WeddingInfo() {
  // Dohvatanje podataka (ovo radi samo na serveru)
  const event = await prisma.event.findFirst({
    select: { coupleName: true, location: true, date: true, guestMessage: true },
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-center">{event?.coupleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Datum i vreme</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(event?.date)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Lokacija</h3>
            <p className="text-sm text-muted-foreground">{event?.location}</p>
          </div>
        </div>

        {event?.guestMessage && (
  <div className="flex items-start gap-3">
    <HeartIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
    <div>
      <h3 className="font-medium">Poruka za goste</h3>
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
