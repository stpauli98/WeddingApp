import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslation } from "react-i18next"

export default function FAQ() {
  const { t } = useTranslation();
  
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
    <section className="py-20">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">{t('faq.title')}</h2>
          
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full bg-lp-card border border-lp-accent rounded-xl shadow-md p-2 md:p-4">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}> 
                <AccordionTrigger className="text-left text-lg font-semibold text-lp-primary">{item.question}</AccordionTrigger>
                <AccordionContent className="text-lp-text">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}



