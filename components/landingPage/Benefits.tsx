import { Check, Lock, Smartphone, Zap, Heart, Cloud } from "lucide-react"

export default function Benefits() {
  return (
    <section className="py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Zašto izabrati našu aplikaciju</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dizajnirana sa fokusom na jednostavnost i efikasnost, naša aplikacija nudi brojne prednosti
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center mb-4">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const benefits = [
  {
    icon: <Lock className="w-6 h-6 text-rose-600" />,
    title: "Privatnost",
    description:
      "Fotografije su dostupne samo osobama kojima vi dozvolite pristup. Potpuna kontrola nad vašim uspomenama.",
  },
  {
    icon: <Zap className="w-6 h-6 text-rose-600" />,
    title: "Jednostavnost",
    description:
      "Intuitivni interfejs koji omogućava lako korišćenje za sve goste, bez obzira na njihovo tehničko znanje.",
  },
  {
    icon: <Smartphone className="w-6 h-6 text-rose-600" />,
    title: "Mobilna podrška",
    description: "Aplikacija radi savršeno na svim uređajima - telefonima, tabletima i računarima.",
  },
  {
    icon: <Heart className="w-6 h-6 text-rose-600" />,
    title: "Bez propuštenih trenutaka",
    description: "Prikupite fotografije iz svih uglova i perspektiva, uhvatite svaki poseban trenutak vašeg dana.",
  },
  {
    icon: <Cloud className="w-6 h-6 text-rose-600" />,
    title: "Sigurno čuvanje",
    description: "Sve fotografije se čuvaju u oblaku, tako da nikada nećete izgubiti dragocene uspomene.",
  },
  {
    icon: <Check className="w-6 h-6 text-rose-600" />,
    title: "Bez instalacije",
    description: "Gosti ne moraju da instaliraju aplikaciju - sve funkcioniše direktno kroz web pretraživač.",
  },
]
