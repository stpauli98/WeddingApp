"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, MapPinIcon, HeartIcon } from "lucide-react"

export function WeddingInfo() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-center">Marija & Nikola</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Datum i vreme</h3>
            <p className="text-sm text-muted-foreground">15. jun 2024. u 17:00h</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Lokacija</h3>
            <p className="text-sm text-muted-foreground">Hotel Grand, Bulevar oslobođenja 56, Beograd</p>
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

        <div className="mt-6 bg-muted p-3 rounded-md text-sm">
          <p className="font-medium mb-2">Kako koristiti aplikaciju:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Možete uploadovati do 10 slika sa svadbe</li>
            <li>Ostavite poruku ili čestitku mladencima</li>
            <li>Sve slike i poruke će biti sačuvane u digitalnom albumu</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
