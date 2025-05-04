import Image from "next/image"
import { ArrowRight, QrCode, Upload, Users } from "lucide-react"

type HowItWorksProps = {
  id?: string;
};

export default function HowItWorks({ id }: HowItWorksProps) {
  return (
    <section id={id} className="py-20 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Kako funkcioniše</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Naša aplikacija omogućava jednostavno prikupljanje i deljenje svih fotografija sa vašeg venčanja
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Za mladence</h3>
                <p className="text-muted-foreground">
                  Kreirajte svoj događaj u nekoliko jednostavnih koraka. Unesite datum venčanja, dodajte osnovne
                  informacije i dobićete jedinstveni kod za vaše goste.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Podjelite QR kod</h3>
                <p className="text-muted-foreground">
                  Podjelite jedinstveni QR kod sa vašim gostima putem pozivnica ili postavite ga na vidljivo mesto tokom
                  proslave.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Za goste</h3>
                <p className="text-muted-foreground">
                  Gosti skeniraju QR kod, pristupaju galeriji i jednostavno otpremaju fotografije direktno sa svojih
                  telefona.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Pristupite svim fotografijama</h3>
                <p className="text-muted-foreground">
                  Nakon vjenčanja, imate pristup svim fotografijama na jednom mjestu. Možete ih preuzeti, dijeliti ili
                  kreirati posebne albume.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative w-full aspect-[4/5] max-w-md mx-auto">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photos-by-lanty-O38Id_cyV4M-unsplash.jpg-AxWKul1i86GZ5PjxXEUimpeEnTmupv.jpeg"
                alt="Dekoracija stola za venčanje"
                fill
                className="object-cover rounded-2xl shadow-xl"
              />

              <div className="absolute -top-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-2">
                  <QrCode className="w-8 h-8 text-rose-600" />
                </div>
                <div className="text-sm font-medium text-center">Jednostavno skeniranje</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
