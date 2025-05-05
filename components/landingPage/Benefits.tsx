import { Check, Lock, Smartphone, Zap, Heart, Cloud } from "lucide-react"

export default function Benefits() {
  return (
    <section className="py-20">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">Zašto izabrati našu aplikaciju</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            Dizajnirana sa fokusom na jednostavnost i efikasnost, naša aplikacija nudi brojne prednosti
          </p>
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

const benefits = [
  {
    icon: <Lock className="w-6 h-6 text-lp-accent" />,
    title: "Privatnost i sigurnost",
    description:
      "Samo vaši gosti imaju pristup slikama — nema javnog dijeljenja, potpuna kontrola nad privatnošću i sigurnošću uspomena.",
  },
  {
    icon: <Zap className="w-6 h-6 text-lp-accent" />,
    title: "Jednostavno za sve",
    description:
      "Nema instalacije, nema komplikacija — sve funkcioniše kroz web pretraživač na svakom uređaju.",
  },
  {
    icon: <Smartphone className="w-6 h-6 text-lp-accent" />,
    title: "Mobilna i desktop podrška",
    description:
      "Aplikacija radi besprijekorno na telefonima, tabletima i računarima, za sve generacije gostiju.",
  },
  {
    icon: <Cloud className="w-6 h-6 text-lp-accent" />,
    title: "Sigurno čuvanje u oblaku",
    description:
      "Sve slike se čuvaju na sigurnom (Cloudinary), sa backupom — nema gubitka uspomena.",
  },
  {
    icon: <Check className="w-6 h-6 text-lp-accent" />,
    title: "Brz pristup QR kodom",
    description:
      "Gosti pristupaju događaju jednostavno — skeniraju QR kod, unesu ime i email, potvrde kod i odmah mogu uploadovati slike.",
  },
  {
    icon: <Heart className="w-6 h-6 text-lp-accent" />,
    title: "Poruke i čestitke",
    description:
      "Uz slike, gosti mogu ostaviti poruku ili čestitku — sve uspomene na jednom mjestu.",
  },
]
