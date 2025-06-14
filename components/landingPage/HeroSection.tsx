import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"

export default function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Language selector na vrhu hero sekcije */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector className="backdrop-blur-sm bg-white/50" />
      </div>
      
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-lp-muted opacity-10">
        <Image
          src="/images/hero-section.jpg"
          alt="Wedding decoration"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>

      <div className="container px-6 mx-auto">
        
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-lp-primary mb-8">
              {/* Fallback na hardkodirani tekst ako prijevod nije dostupan */}
              {t('hero.title') ? (
                <>
                  {t('hero.title').split('<accent>')[0]}
                  <span className="text-lp-accent">{t('hero.title').split('<accent>')[1].split('</accent>')[0]}</span>
                  {t('hero.title').split('</accent>')[1]}
                </>
              ) : (
                <>
                  Sačuvajte sve uspomene sa vašeg <span className="text-lp-accent">vjenčanja</span>
                </>
              )}
            </h1>
            <p className="text-md md:text-lg text-lp-text mb-12 max-w-2xl mx-auto lg:mx-0">
              {t('hero.description') || 'Jednostavan način da prikupite sve fotografije koje su vaši gosti napravili tokom vjenčanja na jednom mjestu, bez komplikacija.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
              <Link href={`/${getCurrentLanguageFromPath()}/admin/register`} className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors">
                {t('hero.createEvent') || 'Kreirajte besplatan događaj'}
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-lp-text text-lp-text font-semibold rounded-lg px-6 py-2 transition-colors hover:bg-lp-bg hover:border-lp-accent hover:text-lp-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-accent"
              >
                {t('hero.howItWorks') || 'Kako funkcioniše'}
              </Link>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto">
              {/* Slika sa ljepšim okvirom, bez brojača na slici */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-xl mb-12">
                <Image
                  src="/images/drze-se-za-ruke.jpg"
                  alt="Mladenci se drže za ruke"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  priority
                />
              </div>
              
              {/* Brojač ispod slike kao zasebni element */}
              <div className="w-full bg-lp-card shadow-xl rounded-xl px-6 py-3 sm:px-8 sm:py-4 flex flex-col items-center transition-transform duration-200 ease-in-out hover:scale-105">
                <div className="text-sm font-semibold text-lp-text tracking-wide uppercase mb-1">{t('hero.imagesCollected')}</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-lp-accent">1.250+</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
