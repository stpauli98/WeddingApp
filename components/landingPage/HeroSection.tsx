import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HeroSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-10">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/samantha-gades-x40Q9jrEVT0-unsplash.jpg-OdfH503t9CO89Tw65g7mMjmsbLn1Oe.jpeg"
          alt="Wedding decoration"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Sačuvajte sve uspomene sa vašeg <span className="text-rose-600">venčanja</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Jednostavan način da prikupite sve fotografije koje su vaši gosti napravili tokom venčanja na jednom
              mestu, bez komplikacija.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/admin/register"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-6 h-auto rounded-lg"
              >
                Registrujte se
              </Link>
              <Link
                href="#how-it-works"
                className="border-rose-600 text-rose-600 hover:bg-rose-50 font-semibold px-8 py-6 h-auto rounded-lg"
              >
                Kako funkcioniše
              </Link>
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jeremy-wong-weddings-464ps_nOflw-unsplash.jpg-vgCJXLrTmNrEVnDt4NNSCtmFsQpHpt.jpeg"
                alt="Mladenci se drže za ruke"
                fill
                className="object-cover rounded-2xl shadow-2xl"
                priority
              />
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-lg shadow-lg">
                <div className="text-sm font-medium">Prikupljeno slika</div>
                <div className="text-2xl font-bold text-rose-600">1,254</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
