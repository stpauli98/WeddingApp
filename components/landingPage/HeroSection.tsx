import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useState, useRef, useCallback } from "react"
import { Heart, ChevronLeft, ChevronRight } from "lucide-react"
import ImageSlider from "./ImageSlider"

export default function HeroSection() {
  const { t } = useTranslation();
  const [imagesCount, setImagesCount] = useState(0);
  const [activeTab, setActiveTab] = useState('admin');
  const sectionRef = useRef<HTMLElement>(null);
  
  // Slike za admin i guest slajdere
  const adminImages = [
    "/slider_pictures/1.png",
    "/slider_pictures/2.png",
    "/slider_pictures/3.png",
    "/slider_pictures/4.png",
    "/slider_pictures/5.png",
    "/slider_pictures/6.png"
  ];
  
  const guestImages = [
    "/slider_pictures/21.png",
    "/slider_pictures/22.png",
    "/slider_pictures/23.png",
    "/slider_pictures/24.png"
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
            className="flex-1 flex flex-col items-center justify-center gap-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            {/* Slajderi */}
            <div className="w-full my-6">
              {/* Tabs za mobilne uređaje */}
              <div className="md:hidden mb-4">
                <div className="flex justify-center border-b border-lp-muted">
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`py-2 px-4 font-semibold text-lg ${activeTab === 'admin' ? 'text-lp-primary border-b-2 border-lp-primary' : 'text-lp-text/70'}`}
                    aria-selected={activeTab === 'admin'}
                    role="tab"
                  >
                    {t('hero.adminTitle') || "Admin"}
                  </button>
                  <button 
                    onClick={() => setActiveTab('guest')}
                    className={`py-2 px-4 font-semibold text-lg ${activeTab === 'guest' ? 'text-lp-primary border-b-2 border-lp-primary' : 'text-lp-text/70'}`}
                    aria-selected={activeTab === 'guest'}
                    role="tab"
                  >
                    {t('hero.guestTitle') || "Guest"}
                  </button>
                </div>
              </div>
              
              {/* Desktop prikaz - oba slajdera */}
              <div className="hidden md:flex flex-row items-center justify-center gap-12 w-full">
                {/* Admin slajder */}
                <div className="w-1/2 max-w-md">
                  <ImageSlider 
                    images={adminImages} 
                    title={t('hero.adminTitle') || "Admin"} 
                    ariaLabel={t('hero.adminScreenshot') || "Screenshot admin dijela aplikacije"}
                  />
                </div>
                
                {/* Guest slajder */}
                <div className="w-1/2 max-w-md">
                  <ImageSlider 
                    images={guestImages} 
                    title={t('hero.guestTitle') || "Guest"} 
                    ariaLabel={t('hero.guestScreenshot') || "Screenshot korisničkog dijela aplikacije"}
                  />
                </div>
              </div>
              
              {/* Mobilni prikaz - samo aktivni tab */}
              <div className="md:hidden w-full max-w-full mx-auto px-2">
                {activeTab === 'admin' && (
                  <ImageSlider 
                    images={adminImages} 
                    title="" 
                    ariaLabel={t('hero.adminScreenshot') || "Screenshot admin dijela aplikacije"}
                    hideTitle={true}
                  />
                )}
                {activeTab === 'guest' && (
                  <ImageSlider 
                    images={guestImages} 
                    title="" 
                    ariaLabel={t('hero.guestScreenshot') || "Screenshot korisničkog dijela aplikacije"}
                    hideTitle={true}
                  />
                )}
              </div>
            </div>
            
            {/* Brojač ispod slajdera */}
            <motion.div 
              className="w-full max-w-xs bg-lp-card shadow-xl rounded-xl px-6 py-3 sm:px-8 sm:py-4 flex flex-col items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              role="status"
              aria-live="polite"
            >
              <div className="text-sm font-semibold text-lp-text tracking-wide uppercase mb-1">{t('hero.imagesCollected') || 'Prikupljenih fotografija'}</div>
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
          </motion.div>
        </div>
      </div>
    </section>
  )
}
