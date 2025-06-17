import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Facebook, Twitter, Heart, ChevronUp, Camera, Mail } from "lucide-react"
import FooterCommentForm from "./FooterCommentForm"
import { useTranslation } from "react-i18next"
import { useState, useEffect, useRef } from "react"
import { getCurrentLanguageFromPath } from "@/lib/utils/language"
import { motion, AnimatePresence } from "framer-motion"

export default function Footer() {
  const { t } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  
  // Animacijske varijante za sekcije
  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }
    }
  };
  
  // Animacijske varijante za socijalne ikone
  const socialIconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.3 + i * 0.1,
        type: "spring",
        stiffness: 500,
        damping: 15
      }
    }),
    hover: {
      scale: 1.2,
      rotate: [0, -10, 10, -10, 0],
      transition: {
        duration: 0.5
      }
    }
  };
  
  // Funkcija za skrolanje na vrh stranice
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Pratimo poziciju skrola da bismo prikazali/sakrili dugme
  useEffect(() => {
    const handleScroll = () => {
      // Prikazujemo dugme samo kada korisnik skrola ispod 500px
      setShowScrollTop(window.scrollY > 500);
    };
    
    // Dodajemo event listener
    window.addEventListener('scroll', handleScroll);
    
    // Inicijalno provjeravamo poziciju
    handleScroll();
    
    // Čistimo event listener kada se komponenta unmountuje
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <footer 
      ref={footerRef} 
      className="bg-lp-bg text-lp-text py-16 border-t border-lp-accent relative overflow-hidden"
      role="contentinfo"
      aria-label="Podnožje stranice"
    >
      {/* Dekorativni elementi u pozadini */}
      <motion.div 
        className="absolute bottom-0 left-0 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Camera size={180} />
      </motion.div>
      
      <motion.div 
        className="absolute top-10 right-10 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Mail size={150} />
      </motion.div>
      <div className="container px-6 mx-auto">
        <motion.div 
          className="grid md:grid-cols-2 gap-12 mb-12"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div>
            <motion.h3 
              className="text-2xl font-bold text-lp-primary mb-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('footer.title')}
            </motion.h3>
            <motion.p 
              className="text-lp-text mb-6 max-w-md"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {t('footer.subtitle')}
            </motion.p>
            <motion.div 
              className="flex gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link 
                  href={`/${getCurrentLanguageFromPath()}/admin/register`} 
                  className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors inline-block"
                  aria-label={t('footer.button')}
                >
                  {t('footer.button')}
                </Link>
              </motion.div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            viewport={{ once: true }}
          >
            <FooterCommentForm />
          </motion.div>
        </motion.div>
       

        <motion.div 
          className="border-t border-lp-accent pt-8 flex flex-col md:flex-row justify-between items-center"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div 
            className="text-lp-text/70 text-sm mb-4 md:mb-0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            &copy; {new Date().getFullYear()} <a href="https://www.nextpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-accent font-semibold hover:underline">Next Pixel</a>. {t('footer.copyright')}
          </motion.div>

          <div className="flex gap-6 items-center">
            <motion.div
              custom={0}
              variants={socialIconVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true }}
            >
              <Link href="https://instagram.com" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
                <Instagram className="w-5 h-5" />
                <span className="sr-only">Instagram</span>
              </Link>
            </motion.div>
            
            <motion.div
              custom={1}
              variants={socialIconVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true }}
            >
              <Link href="https://facebook.com" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
                <Facebook className="w-5 h-5" />
                <span className="sr-only">Facebook</span>
              </Link>
            </motion.div>
            
            <motion.div
              custom={2}
              variants={socialIconVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true }}
            >
              <Link href="https://tiktok.com" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">TikTok</span>
              </Link>
            </motion.div>
            
            {/* Product Hunt bedž */}
            <motion.div
              custom={3}
              variants={socialIconVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="ml-2"
            >
              <a 
                href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="AddMemories na Product Hunt"
              >
                <img 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818" 
                  alt="AddMemories - Collect wedding photos & wishes from your guests | Product Hunt" 
                  width="120" 
                  height="26" 
                  style={{ width: '120px', height: '26px' }}
                />
              </a>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="mt-8 text-center text-lp-text/70 text-sm flex items-center justify-center relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="flex items-center gap-1">
            {t('footer.copyright')} <Heart className="w-3 h-3 text-lp-accent inline" />
          </span>
          
          {/* Strelica za povratak na vrh s AnimatePresence za glatku tranziciju */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button 
                onClick={scrollToTop}
                className="absolute right-0 p-3 rounded-full bg-lp-accent text-white shadow-lg hover:bg-lp-primary"
                aria-label="Povratak na vrh stranice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </footer>
  )
}
