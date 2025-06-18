import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageSliderProps {
  images: string[];
  title: string;
  ariaLabel: string;
  hideTitle?: boolean;
}

export default function ImageSlider({ images, title, ariaLabel, hideTitle = false }: ImageSliderProps) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Funkcije za navigaciju slajdera
  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  }, [images.length]);
  
  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);
  
  const goToSlide = useCallback((slideIndex: number) => {
    setCurrentSlide(slideIndex);
  }, []);
  
  // Funkcije za pauziranje/nastavak automatskog mijenjanja slajdova
  const handleMouseEnter = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);
  
  // Automatsko mijenjanje slajdova
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        goToNextSlide();
      }, 4000); // Mijenjaj slajd svake 4 sekunde
    } else if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, goToNextSlide]);
  
  return (
    <div className="flex flex-col">
      {!hideTitle && title && (
        <h3 className="text-xl font-bold text-center mb-3 text-lp-primary">{title}</h3>
      )}
      <motion.div 
        className="relative w-full mb-12"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full" style={{ height: 'min(600px, 90vh)' }}>
          {images.map((src, index) => (
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
                alt={`${ariaLabel} ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain md:object-contain"
                priority={true} // Set priority for all images to fix LCP warnings
                quality={95}
              />
              {/* Step indicator */}
              <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
                <span className="text-lp-primary font-medium">
                  {t('imageSlider.step', { number: index + 1 })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Kontrole za slajder */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 z-20">
          <motion.button
            className="bg-white/50 hover:bg-white/70 rounded-full p-1.5 backdrop-blur-sm shadow-md"
            onClick={goToPrevSlide}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={t('imageSlider.previousImage')}
          >
            <ChevronLeft className="w-5 h-5 text-lp-primary" />
          </motion.button>
          <motion.button
            className="bg-white/50 hover:bg-white/70 rounded-full p-1.5 backdrop-blur-sm shadow-md"
            onClick={goToNextSlide}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={t('imageSlider.nextImage')}
          >
            <ChevronRight className="w-5 h-5 text-lp-primary" />
          </motion.button>
        </div>
        
        {/* Indikatori slajdova */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-6 h-6 flex items-center justify-center rounded-full transition-all text-xs font-medium ${index === currentSlide ? 'bg-lp-primary text-white scale-110' : 'bg-lp-primary/30 text-lp-primary hover:bg-lp-primary/40'}`}
              aria-label={t('imageSlider.goToImage', { number: index + 1 })}
              aria-current={index === currentSlide ? 'true' : 'false'}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        <span className="sr-only">
          {t('hero.appScreenshotsDescription') || 'Screenshot aplikacije koji prikazuje funkcionalnosti za prikupljanje slika s vjenčanja'}
        </span>
      </motion.div>
    </div>
  );
}
