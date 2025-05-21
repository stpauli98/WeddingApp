import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Facebook, Twitter, Heart, ChevronUp } from "lucide-react"
import FooterCommentForm from "./FooterCommentForm"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

export default function Footer() {
  const { t } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
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
    <footer className="bg-lp-bg text-lp-text py-16 border-t border-lp-accent">
      <div className="container px-6 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold text-lp-primary mb-6">{t('footer.title')}</h3>
            <p className="text-lp-text mb-6 max-w-md">
              {t('footer.subtitle')}
            </p>
            <div className="flex gap-4">
              <Link href="/admin/register" className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors">
                {t('footer.button')}
              </Link>
            </div>
          </div>
          <FooterCommentForm />
        </div>
       

        <div className="border-t border-lp-accent pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-lp-text/70 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} <a href="https://www.nextpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-accent font-semibold hover:underline">Next Pixel</a>. {t('footer.copyright')}
          </div>

          <div className="flex gap-6">
            <Link href="https://instagram.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Instagram className="w-5 h-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link href="https://facebook.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Facebook className="w-5 h-5" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link href="https://tiktok.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Twitter className="w-5 h-5" />
              <span className="sr-only">TikTok</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-lp-text/70 text-sm flex items-center justify-center relative">
          {t('footer.copyright')}
          
          {/* Strelica za povratak na vrh */}
          <button 
            onClick={scrollToTop}
            className={`absolute right-0 p-3 rounded-full bg-lp-accent text-white shadow-lg transition-all duration-300 hover:bg-lp-primary ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            aria-label="Povratak na vrh stranice"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  )
}
