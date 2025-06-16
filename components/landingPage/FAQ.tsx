import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { useRef } from "react"
import { HelpCircle, MessageCircle } from "lucide-react"

export default function FAQ() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  
  // Animacijske varijante za naslov
  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7 }
    }
  };
  
  // Animacijske varijante za accordion
  const accordionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        duration: 0.5 
      }
    }
  };
  
  // Definiramo pitanja i odgovore korištenjem prijevoda iz JSON fajlova
  const faqItems = [
    {
      question: t('faq.question1'),
      answer: t('faq.answer1'),
    },
    {
      question: t('faq.question2'),
      answer: t('faq.answer2'),
    },
    {
      question: t('faq.question3'),
      answer: t('faq.answer3'),
    },
    {
      question: t('faq.question4'),
      answer: t('faq.answer4'),
    }
  ];
  
 
  return (
    <section 
      className="py-20 relative overflow-hidden" 
      ref={sectionRef}
      aria-labelledby="faq-heading"
      role="region"
    >
      {/* Dekorativni elementi u pozadini */}
      <motion.div 
        className="absolute top-20 left-10 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <HelpCircle size={150} />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-20 right-10 text-lp-accent opacity-5 pointer-events-none"
        animate={{ 
          rotate: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
        aria-hidden="true"
      >
        <MessageCircle size={130} />
      </motion.div>
      
      <div className="container px-6 mx-auto">
        <motion.div 
          className="text-center mb-14"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">{t('faq.title')}</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            {t('faq.subtitle') || 'Odgovori na najčešća pitanja o našoj usluzi'}
          </p>
        </motion.div>

        <motion.div 
          className="max-w-3xl mx-auto"
          variants={accordionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.div
            initial={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
            whileHover={{ 
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              scale: 1.01
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-xl overflow-hidden"
          >
            <Accordion 
              type="single" 
              collapsible 
              className="w-full bg-lp-card border border-lp-accent rounded-xl shadow-md p-2 md:p-4"
            >
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}> 
                  <AccordionTrigger 
                    className="text-left text-lg font-semibold text-lp-primary hover:text-lp-accent transition-colors"
                    aria-label={`Pitanje: ${item.question}`}
                  >
                    <motion.span 
                      whileHover={{ x: 5 }} 
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {item.question}
                    </motion.span>
                  </AccordionTrigger>
                  <AccordionContent className="text-lp-text">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.answer}
                    </motion.div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}



