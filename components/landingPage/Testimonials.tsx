import { Star } from "lucide-react"

export default function Testimonials() {
  return (
    <section className="py-20 bg-lp-bg">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">Šta kažu naši korisnici</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            Pridružite se stotinama zadovoljnih parova koji su koristili našu aplikaciju za svoje venčanje
          </p>
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
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-lp-primary">{testimonial.name}</div>
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

const testimonials = [
  {
    text: "Aplikacija je bila savršena za naše vjenčanje. Gosti su lako dijelili svoje fotografije, a mi smo dobili prekrasne uspomene koje bismo inače propustili!",
    name: "Marija i Nikola",
    role: "Vkenčani jun 2023.",
  },
  {
    text: "Mnogo bolje od deljenja fotografija preko WhatsApp-a ili drugih društvenih mreža. Sve je na jednom mestu i privatno.",
    name: "Jelena i Stefan",
    role: "Vjenčani maj 2023.",
  },
  {
    text: "Jednostavno za korišćenje i za nas i za naše goste. Dobili smo preko 500 fotografija sa našeg venčanja, što je bilo neverovatno!",
    name: "Ana i Marko",
    role: "Vjenčani avgust 2023.",
  },
]
