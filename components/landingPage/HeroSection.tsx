import Image from "next/image"
import Link from "next/link"
import TotalImagesCounter from "./TotalImagesCounter"

export default function HeroSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-lp-muted opacity-10">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/samantha-gades-x40Q9jrEVT0-unsplash.jpg-OdfH503t9CO89Tw65g7mMjmsbLn1Oe.jpeg"
          alt="Wedding decoration"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="container px-6 mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-lp-primary mb-8">
              Sačuvajte sve uspomene sa vašeg <span className="text-lp-accent">vjenčanja</span>
            </h1>
            <p className="text-md md:text-lg text-lp-text mb-12 max-w-2xl mx-auto lg:mx-0">
              Jednostavan način da prikupite sve fotografije koje su vaši gosti napravili tokom vjenčanja na jednom
              mestu, bez komplikacija.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
              <Link href="/admin/register" className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors">
                Kreirajte besplatan događaj
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-lp-text text-lp-text font-semibold rounded-lg px-6 py-2 transition-colors hover:bg-lp-bg hover:border-lp-accent hover:text-lp-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-accent"
              >
                Kako funkcioniše
              </Link>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jeremy-wong-weddings-464ps_nOflw-unsplash.jpg-vgCJXLrTmNrEVnDt4NNSCtmFsQpHpt.jpeg"
                alt="Mladenci se drže za ruke"
                fill
                className="object-cover rounded-2xl shadow-md"
                priority
              />
              {/* Badge za desktop/tablet: lebdi ispod slike, centriran */}
              <div
                className="hidden sm:flex absolute left-1/2 -translate-x-1/2 -bottom-8 bg-lp-card border border-lp-accent shadow-md rounded-xl px-8 py-4 flex-col items-center transition-transform duration-200 ease-in-out hover:scale-105 z-20 w-auto"
              >
                <div className="text-sm font-semibold text-lp-text tracking-wide uppercase mb-1">Prikupljeno slika</div>
                <div className="text-2xl font-extrabold text-lp-accent"><TotalImagesCounter /></div>
              </div>
              {/* Badge za mobilne uređaje: ispod slike, centriran, veća širina */}
              <div className="sm:hidden w-11/12 mx-auto mt-4 bg-lp-card border border-lp-accent shadow-md rounded-xl px-4 py-3 flex flex-col items-center transition-transform duration-200 ease-in-out hover:scale-105 z-10">
                <div className="text-xs font-semibold text-lp-text tracking-wide uppercase mb-1">Prikupljeno slika</div>
                <div className="text-xl font-extrabold text-lp-accent"><TotalImagesCounter /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
