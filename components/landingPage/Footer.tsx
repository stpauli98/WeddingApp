import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Facebook, Heart, ChevronUp, Camera, Mail } from "lucide-react"
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
              <Link href="https://www.instagram.com/pixelnext9/" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
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
              <Link href="#" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
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
              <Link href="https://www.tiktok.com/@next.pixel9" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.27 0 .54.03.79.1V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.65a6.34 6.34 0 0 0 10.86 4.48 6.29 6.29 0 0 0 1.83-4.48l.01-7.66a8.16 8.16 0 0 0 4.87 1.63v-3.45a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span className="sr-only">TikTok</span>
              </Link>
            </motion.div>
            
            <motion.div
              custom={3}
              variants={socialIconVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true }}
            >
              <Link href="https://x.com/nextpixel98" className="text-lp-text/70 hover:text-lp-accent transition-colors block">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5549 21H20.7996L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
                </svg>
                <span className="sr-only">X (Twitter)</span>
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
