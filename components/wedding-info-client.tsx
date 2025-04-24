"use client"

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

interface WeddingInfoClientProps {
  coupleName: string | null
  location: string | null
  date: Date | string | null
}

export function WeddingInfoClient({ coupleName, location, date }: WeddingInfoClientProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-center">{coupleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Datum i vreme</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(date)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Lokacija</h3>
            <p className="text-sm text-muted-foreground">{location}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <HeartIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Fun fact</h3>
            <p className="text-sm text-muted-foreground">
              Marija i Nikola su se upoznali na koncertu pre tačno 5 godina!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
