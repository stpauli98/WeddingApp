import { Lock, Smartphone, Zap, Cloud, Camera, Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { useRef } from "react"

export default function Benefits() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  
  // Jednostavne animacijske varijante za naslov
  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  // Jednostavne animacijske varijante za grid container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  // Pojednostavljene animacije za benefite
  const benefitVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5
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
    }
  ];
  
  return (
    <section 
      className="py-20 relative overflow-hidden" 
      ref={sectionRef}
      aria-labelledby="benefits-heading"
      role="region"
    >
      {/* Pojednostavljeni dekorativni elementi */}
      <motion.div 
        className="absolute -top-20 -right-20 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, -10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Camera size={160} />
      </motion.div>
      
      <motion.div 
        className="absolute -bottom-20 -left-20 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Star size={140} />
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

        {/* Pojednostavljen grid bez AnimatePresence */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-lp-card p-6 rounded-xl shadow-md border border-lp-accent hover:border-lp-primary hover:shadow-lg transition-all flex flex-col items-center text-center"
              variants={benefitVariants}
              whileHover={{ 
                scale: 1.02, 
                y: -3
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25
              }}
            >
              <motion.div 
                className="w-16 h-16 rounded-lg bg-lp-muted flex items-center justify-center mb-4"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                {benefit.icon}
              </motion.div>
              <h3 className="text-lg font-semibold text-lp-primary mb-2">{benefit.title}</h3>
              <p className="text-lp-text text-sm">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}


