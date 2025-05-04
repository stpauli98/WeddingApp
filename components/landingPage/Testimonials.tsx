import { Star } from "lucide-react"

export default function Testimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Šta kažu naši korisnici</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pridružite se stotinama zadovoljnih parova koji su koristili našu aplikaciju za svoje venčanje
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block bg-rose-100 text-rose-800 px-4 py-2 rounded-full text-sm font-medium">
            Preko 10,000+ fotografija prikupljeno kroz našu platformu
          </div>
        </div>
      </div>
    </section>
  )
}

const testimonials = [
  {
    text: "Ova aplikacija je bila savršena za naše venčanje! Naši gosti su lako otpremali fotografije, a mi smo dobili toliko divnih trenutaka koje bismo inače propustili.",
    name: "Marija i Nikola",
    role: "Venčani jun 2023.",
  },
  {
    text: "Jednostavno za korišćenje i za nas i za naše goste. Dobili smo preko 500 fotografija sa našeg venčanja, što je bilo neverovatno!",
    name: "Ana i Marko",
    role: "Venčani avgust 2023.",
  },
  {
    text: "Mnogo bolje od deljenja fotografija preko WhatsApp-a ili drugih društvenih mreža. Sve je na jednom mestu i privatno.",
    name: "Jelena i Stefan",
    role: "Venčani maj 2023.",
  },
]
