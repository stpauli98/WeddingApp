import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useState, useRef, useCallback } from "react"
import { Heart, ChevronLeft, ChevronRight } from "lucide-react"

export default function HeroSection() {
  const { t } = useTranslation();
  const [imagesCount, setImagesCount] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  
  // Slajder stanje i konfiguracija
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  // Koristimo apsolutne putanje koje počinju s / kako bi se izbjegle 404 greške s jezičnim prefiksima
  const sliderImages = [
    "/slider_pictures/1.png", // Apsolutna putanja od korijena projekta
    "/slider_pictures/4.png",
    "/slider_pictures/2.png",
    "/slider_pictures/3.png",
   
    "/slider_pictures/5.png"
  ];
  
  // Paralaks efekt za pozadinu
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  
  // Konfiguracijski parametri za dekorativne elemente
  const decorativeElements = [
    { id: 1, initialX: -5, initialY: 10, delay: 0, duration: 20 },
    { id: 2, initialX: 85, initialY: 15, delay: 2, duration: 25 },
    { id: 3, initialX: 25, initialY: 80, delay: 1, duration: 18 },
    { id: 4, initialX: 70, initialY: 70, delay: 3, duration: 22 },
    { id: 5, initialX: 40, initialY: 30, delay: 0.5, duration: 24 }
  ];

  // Animacija brojača
  useEffect(() => {
    const targetCount = 1250;
    const duration = 2000; // 2 sekunde
    const startTime = Date.now();
    
    const updateCounter = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        setImagesCount(Math.floor(progress * targetCount));
        requestAnimationFrame(updateCounter);
      } else {
        setImagesCount(targetCount);
      }
    };
    
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(updateCounter);
    }, 500); // Malo odgode prije početka animacije
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Funkcija za promjenu slajda
  const goToSlide = useCallback((index: number) => {
    // Osiguraj da je index unutar granica
    const newIndex = ((index % sliderImages.length) + sliderImages.length) % sliderImages.length;
    setCurrentSlide(newIndex);
  }, [sliderImages.length]);
  
  // Funkcije za navigaciju slajdera
  const goToNextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const goToPrevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);
  
  // Automatsko mijenjanje slajdova
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        goToNextSlide();
      }, 4000); // Promjena slajda svakih 4 sekunde
    }
    
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, goToNextSlide]);
  
  // Pauziranje automatskog mijenjanja na hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);
  
  return (
    <section 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden" 
      aria-labelledby="hero-heading"
      role="region">
      {/* Language selector na vrhu hero sekcije */}
      <motion.div 
        className="absolute top-4 right-4 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <LanguageSelector className="backdrop-blur-sm bg-white/50" />
      </motion.div>
      
      {/* Background decoration with parallax effect */}
      <motion.div 
        className="absolute inset-0 pointer-events-none overflow-hidden bg-lp-muted opacity-10"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        style={{ y: backgroundY }}
        transition={{ duration: 10, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
      >
        <Image
          src="/images/hero-section.jpg"
          alt="Wedding decoration"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </motion.div>
      
      {/* Decorative elements - hearts */}
      {decorativeElements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute pointer-events-none text-lp-accent opacity-20"
          style={{
            left: `${element.initialX}%`,
            top: `${element.initialY}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0.1, 0.3, 0.1], 
            scale: [0.7, 1, 0.7],
            y: [0, -15, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ 
            delay: element.delay, 
            duration: element.duration, 
            repeat: Infinity, 
            repeatType: "loop",
            ease: "easeInOut"
          }}
          aria-hidden="true"
        >
          <Heart size={element.id % 2 === 0 ? 24 : 32} />
        </motion.div>
      ))}

      <div className="container px-6 mx-auto">
        
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 id="hero-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-lp-primary mb-8">
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link 
                  href={`/${getCurrentLanguageFromPath()}/admin/register`} 
                  className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors inline-block"
                  aria-label={t('hero.createEvent') || 'Kreirajte besplatan događaj'}
                >
                  {t('hero.createEvent') || 'Kreirajte besplatan događaj'}
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center border border-lp-text text-lp-text font-semibold rounded-lg px-6 py-2 transition-colors hover:bg-lp-bg hover:border-lp-accent hover:text-lp-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-accent"
                  aria-label={t('hero.howItWorks') || 'Kako funkcioniše'}
                >
                  {t('hero.howItWorks') || 'Kako funkcioniše'}
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div 
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Slajder sa screenshot-ovima aplikacije - bez okvira, veće slike */}
              <motion.div 
                className="relative w-full mb-12"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative w-full" style={{ height: '500px' }}>
                  {sliderImages.map((src, index) => (
                    <motion.div
                      key={src}
                      className="absolute inset-0 w-full h-full"
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: index === currentSlide ? 1 : 0,
                        zIndex: index === currentSlide ? 10 : 0
                      }}
                      transition={{ duration: 0.7, ease: "easeInOut" }}
                    >
                      <Image
                        src={src}
                        alt={`Screenshot aplikacije ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                        priority={index === 0}
                        quality={95}
                      />
                    </motion.div>
                  ))}
                </div>
                
                {/* Kontrole za slajder - povećane i pomaknute na stranu */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
                  <motion.button
                    className="bg-white/50 hover:bg-white/70 rounded-full p-2 backdrop-blur-sm shadow-md"
                    onClick={goToPrevSlide}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Prethodna slika"
                  >
                    <ChevronLeft className="w-6 h-6 text-lp-primary" />
                  </motion.button>
                  <motion.button
                    className="bg-white/50 hover:bg-white/70 rounded-full p-2 backdrop-blur-sm shadow-md"
                    onClick={goToNextSlide}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Sljedeća slika"
                  >
                    <ChevronRight className="w-6 h-6 text-lp-primary" />
                  </motion.button>
                </div>
                
                {/* Indikatori slajdova - pomaknuti na dno */}
                <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
                  {sliderImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'bg-lp-primary scale-125' : 'bg-lp-primary/40 hover:bg-lp-primary/60'}`}
                      aria-label={`Prijeđi na sliku ${index + 1}`}
                      aria-current={index === currentSlide ? 'true' : 'false'}
                    />
                  ))}
                </div>
                
                <span className="sr-only">
                  {t('hero.appScreenshotsDescription') || 'Screenshot aplikacije koji prikazuje funkcionalnosti za prikupljanje slika s vjenčanja'}
                </span>
              </motion.div>
              
              {/* Brojač ispod slike kao zasebni element */}
              <motion.div 
                className="w-full bg-lp-card shadow-xl rounded-xl px-6 py-3 sm:px-8 sm:py-4 flex flex-col items-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                role="status"
                aria-live="polite"
              >
                <div className="text-sm font-semibold text-lp-text tracking-wide uppercase mb-1">{t('hero.imagesCollected')}</div>
                <motion.div 
                  className="text-2xl sm:text-3xl font-extrabold text-lp-accent"
                  key={imagesCount}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  aria-label={`${imagesCount}+ ${t('hero.imagesCollected') || 'prikupljenih fotografija'}`}
                >
                  {imagesCount}+
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
