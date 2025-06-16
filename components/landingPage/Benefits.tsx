import { Check, Lock, Smartphone, Zap, Heart, Cloud, Camera, Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useRef, useState, useEffect } from "react"

export default function Benefits() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Osiguravamo da se komponenta prikaže tek kada je potpuno spremna
  useEffect(() => {
    // Kratka odgoda kako bi se osiguralo da su svi resursi učitani
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Animacijske varijante za naslov
  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7 }
    }
  };
  
  // Animacijske varijante za grid container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08, // Smanjeno za brže učitavanje
        delayChildren: 0.1,    // Smanjeno za brže učitavanje
        when: "beforeChildren" // Osigurava da se container prikaže prije djece
      }
    }
  };
  
  // Animacijske varijante za pojedinačne benefite
  const benefitVariants = {
    hidden: { opacity: 0, y: 20 }, // Promijenjeno iz scale u y za manje trzanja
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 30, // Povećano prigušenje za manje oscilacija
        duration: 0.4 // Osigurava konzistentno trajanje
      }
    }
  };
  
  // Definiramo benefite unutar komponente kako bismo mogli koristiti t funkciju
  const benefits = [
    {
      icon: <Lock className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit1Title"),
      description: t("benefits.benefit1Description"),
    },
    {
      icon: <Zap className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit2Title"),
      description: t("benefits.benefit2Description"),
    },
    {
      icon: <Smartphone className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit3Title"),
      description: t("benefits.benefit3Description"),
    },
    {
      icon: <Cloud className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit4Title"),
      description: t("benefits.benefit4Description"),
    },
    {
      icon: <Check className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit5Title") || "Brz pristup QR kodom",
      description: t("benefits.benefit5Description") || "Gosti pristupaju događaju jednostavno — skeniraju QR kod, unesu ime i email, potvrde kod i odmah mogu uploadovati slike.",
    },
    {
      icon: <Heart className="w-6 h-6 text-lp-accent" />,
      title: t("benefits.benefit6Title") || "Poruke i čestitke",
      description: t("benefits.benefit6Description") || "Uz slike, gosti mogu ostaviti poruku ili čestitku — sve uspomene na jednom mjestu.",
    },
  ];
  
  return (
    <section 
      className="py-20 relative overflow-hidden" 
      ref={sectionRef}
      aria-labelledby="benefits-heading"
      role="region"
    >
      {/* Dekorativni elementi u pozadini */}
      <motion.div 
        className="absolute -top-20 -right-20 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Camera size={180} />
      </motion.div>
      
      <motion.div 
        className="absolute -bottom-20 -left-20 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Star size={160} />
      </motion.div>
      
      <div className="container px-6 mx-auto">
        <motion.div 
          className="text-center mb-14"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 id="benefits-heading" className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">{t('benefits.title')}</h2>
          
        </motion.div>

        {/* Koristimo AnimatePresence za kontrolirano prikazivanje grid containera */}
        {/* Koristimo position: absolute za grid dok se učitava kako bi spriječili trzanje */}
        <div className="relative min-h-[500px] md:min-h-[400px]">
          <AnimatePresence>
            {isLoaded && (
              <motion.div 
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible" 
                layout
                layoutRoot
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    layoutId={`benefit-${index}`}
                    className="bg-lp-card p-6 rounded-xl shadow-md border border-lp-accent hover:border-lp-primary hover:shadow-lg hover:shadow-lp-accent/30 transition-all flex flex-col items-center text-center relative"
                    variants={benefitVariants}
                    whileHover={{ 
                      scale: 1.03, 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      y: -5
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30,
                      layout: { duration: 0.3 }
                    }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-lg bg-lp-muted flex items-center justify-center mb-4"
                      whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {benefit.icon}
                    </motion.div>
                    <h3 className="text-lg font-semibold text-lp-primary mb-2">{benefit.title}</h3>
                    <p className="text-lp-text text-sm">{benefit.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

