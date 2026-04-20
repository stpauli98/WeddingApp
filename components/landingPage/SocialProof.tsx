import Image from 'next/image';
import { Heart, Users, Globe } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';
import { CounterCard } from '@/components/motion/CounterCard';

interface SocialProofProps {
  t: TFunction;
}

export default function SocialProof({ t }: SocialProofProps) {
  const iconClass = 'w-8 h-8 text-lp-accent mx-auto mb-3';
  const stats = [
    {
      icon: <Heart aria-hidden="true" className={iconClass} />,
      target: 20,
      suffix: '+',
      label: t('socialProof.statCouples'),
    },
    {
      icon: <Users aria-hidden="true" className={iconClass} />,
      target: 100,
      suffix: '+',
      label: t('socialProof.statGuests'),
    },
    {
      icon: <Globe aria-hidden="true" className={iconClass} />,
      target: 4,
      suffix: '',
      label: t('socialProof.statCountries'),
      sublabel: t('socialProof.countriesList'),
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="social-proof-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll
          as="h2"
          id="social-proof-heading"
          className="font-playfair text-3xl md:text-4xl font-bold text-lp-text text-center mb-12"
        >
          {t('socialProof.title')}
        </FadeInOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <CounterCard
              key={stat.label}
              icon={stat.icon}
              target={stat.target}
              suffix={stat.suffix}
              label={stat.label}
              sublabel={stat.sublabel}
              delay={index * 0.1}
              className="bg-white rounded-xl p-6 text-center shadow-sm border border-lp-border"
            />
          ))}
        </div>

        <FadeInOnScroll delay={0.4} className="flex justify-center mt-8">
          <a
            href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('a11y.productHunt')}
          >
            <Image
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818"
              alt="AddMemories on Product Hunt"
              width={200}
              height={43}
              style={{ width: '200px', height: '43px' }}
              unoptimized
            />
          </a>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
