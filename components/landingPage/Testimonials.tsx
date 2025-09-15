import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Testimonials() {
  const { t } = useTranslation();
  
  // Dinamički testimonials iz translation fajlova
  const testimonials = [
    {
      text: t('testimonials.testimonial1.text'),
      author: t('testimonials.testimonial1.author'),
      role: t('testimonials.testimonial1.role')
    },
    {
      text: t('testimonials.testimonial2.text'),
      author: t('testimonials.testimonial2.author'),
      role: t('testimonials.testimonial2.role')
    },
    {
      text: t('testimonials.testimonial3.text'),
      author: t('testimonials.testimonial3.author'),
      role: t('testimonials.testimonial3.role')
    }
  ];
  
  return (
    <section className="py-20 bg-lp-bg">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">{t('testimonials.title')}</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-lp-card p-8 rounded-xl shadow-md border border-lp-accent flex flex-col items-center text-center"
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-lp-text mb-6 italic">&quot;{testimonial.text}&quot;</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center text-lp-accent font-bold">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-lp-primary">{testimonial.author}</div>
                  <div className="text-xs text-lp-text">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

