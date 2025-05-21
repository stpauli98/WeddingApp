import { Check, Lock, Smartphone, Zap, Heart, Cloud } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Benefits() {
  const { t } = useTranslation();
  
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
    <section className="py-20">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">{t('benefits.title')}</h2>
          
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-lp-card p-6 rounded-xl shadow-md border border-lp-accent hover:border-lp-primary hover:shadow-lg hover:shadow-lp-accent/30 transition-shadow flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-lp-muted flex items-center justify-center mb-4">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-semibold text-lp-primary mb-1">{benefit.title}</h3>
              <p className="text-lp-text text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

