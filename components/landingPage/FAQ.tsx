// components/landingPage/FAQ.tsx — NO 'use client' — RSC
import type { TFunction } from 'i18next';
import { ChevronDown } from 'lucide-react';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface FAQProps {
  t: TFunction;
}

export default function FAQ({ t }: FAQProps) {
  const faqItems = Array.from({ length: 8 }, (_, i) => ({
    question: t(`faq.question${i + 1}`),
    answer: t(`faq.answer${i + 1}`),
  }));

  return (
    <section id="faq" className="py-16 sm:py-20 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-10">
          <h2 id="faq-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t('faq.title')}
          </h2>
          <p className="text-lg text-lp-muted-foreground">{t('faq.subtitle')}</p>
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.1} className="w-full bg-white border border-lp-border rounded-xl shadow-sm p-2 md:p-4">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group border-b border-lp-border/60 last:border-b-0"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-4 px-2 text-left text-base font-semibold text-lp-text hover:text-lp-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded">
                <span>{item.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-5 h-5 shrink-0 text-lp-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-2 pb-4 text-lp-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </FadeInOnScroll>
      </div>
    </section>
  );
}
