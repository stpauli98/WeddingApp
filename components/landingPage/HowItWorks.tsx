import Image from "next/image"
import { ArrowRight, QrCode, Upload, Users, Camera, Heart } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { useRef } from "react"

type HowItWorksProps = {
  id?: string;
};

export default function HowItWorks({ id }: HowItWorksProps) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  
  // Animacijske varijante za container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };
  
  // Animacijske varijante za pojedinačne korake
  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };
  
  return (
    <section 
      id={id} 
      ref={sectionRef} 
      className="py-20 bg-lp-bg relative overflow-hidden"
      aria-labelledby="how-it-works-heading"
      role="region">
      
      {/* Dekorativni elementi u pozadini */}
      <motion.div 
        className="absolute top-10 left-10 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Heart size={120} />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-10 right-10 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <Camera size={100} />
      </motion.div>
      <div className="container px-6 mx-auto">
        <motion.div 
          className="text-center mb-14"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold text-lp-text mb-3">{t('howItWorks.title')}</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            {t('howItWorks.description')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-14 items-center">
          <motion.div 
            className="space-y-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div 
              className="flex gap-4 items-start bg-lp-card border border-lp-accent shadow-md rounded-xl p-5 relative"
              variants={stepVariants}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-lp-primary text-lp-primary-foreground flex items-center justify-center font-bold shadow-md">1</div>
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-lp-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step1Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step1Description')}
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex gap-4 items-start bg-lp-card border border-lp-border shadow-md rounded-xl p-5 relative"
              variants={stepVariants}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-lp-primary text-lp-primary-foreground flex items-center justify-center font-bold shadow-md">2</div>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <QrCode className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step2Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step2Description')}
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex gap-4 items-start bg-lp-card border border-lp-border shadow-md rounded-xl p-5 relative"
              variants={stepVariants}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-lp-primary text-lp-primary-foreground flex items-center justify-center font-bold shadow-md">3</div>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step3Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step3Description')}
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex gap-4 items-start bg-lp-card border border-lp-border shadow-md rounded-xl p-5 relative"
              variants={stepVariants}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-lp-primary text-lp-primary-foreground flex items-center justify-center font-bold shadow-md">4</div>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step4Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step4Description')}
                </p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <motion.div 
              className="relative w-full aspect-[4/5] max-w-md mx-auto"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photos-by-lanty-O38Id_cyV4M-unsplash.jpg-AxWKul1i86GZ5PjxXEUimpeEnTmupv.jpeg"
                alt="Dekoracija stola za vjenčanje"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover rounded-2xl shadow-xl"
                aria-describedby="wedding-table-desc"
              />
              <span id="wedding-table-desc" className="sr-only">
                {t('howItWorks.imageDescription') || 'Elegantna dekoracija stola za vjenčanje s cvijećem i svijećama'}
              </span>

              <motion.div 
                className="absolute -top-6 -left-6 bg-lp-card p-4 rounded-lg shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <div className="flex items-center justify-center w-16 h-16 bg-lp-muted rounded-full mb-2">
                  <QrCode className="w-8 h-8 text-lp-accent" />
                </div>
                <div className="text-sm font-medium text-center">{t('howItWorks.qrCodeText')}</div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
