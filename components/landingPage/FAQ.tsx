import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQ() {
  return (
    <section className="py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Najčešća pitanja</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Odgovori na pitanja koja nas najčešće pitaju
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg font-semibold">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

const faqItems = [
  {
    question: "Zašto bih koristio ovu aplikaciju umesto društvenih mreža?",
    answer:
      "Za razliku od društvenih mreža, naša aplikacija omogućava privatno deljenje fotografija samo sa osobama kojima vi dozvolite pristup. Takođe, sve fotografije su organizovane na jednom mestu, u visokoj rezoluciji i lako ih je preuzeti.",
  },
  {
    question: "Koje su prednosti korišćenja ove aplikacije?",
    answer:
      "Glavne prednosti su jednostavnost korišćenja, privatnost, mogućnost prikupljanja fotografija od svih gostiju na jednom mestu, bez potrebe za instalacijom aplikacije, i mogućnost preuzimanja svih fotografija u originalnoj rezoluciji.",
  },
  {
    question: "Nije li jednostavnije koristiti WhatsApp ili Viber grupu?",
    answer:
      "WhatsApp i Viber grupe imaju ograničenja u pogledu kvaliteta fotografija (kompresija), ograničenog prostora za skladištenje i organizacije. Naša aplikacija čuva fotografije u originalnoj rezoluciji, nema ograničenja u broju fotografija i sve je organizovano na jednom mestu.",
  },
  {
    question: "Koliko košta korišćenje aplikacije?",
    answer:
      "Nudimo besplatni osnovni paket koji uključuje do 500 fotografija. Za veća venčanja, imamo premium pakete koji počinju od 29€ sa neograničenim brojem fotografija i dodatnim funkcionalnostima.",
  },
  {
    question: "Da li gosti moraju da kreiraju naloge?",
    answer:
      "Ne, to je jedna od glavnih prednosti naše aplikacije. Gosti jednostavno skeniraju QR kod i mogu odmah da otpremaju fotografije bez registracije ili instaliranja bilo čega.",
  },
  {
    question: "Koliko dugo se čuvaju fotografije?",
    answer:
      "U osnovnom paketu, fotografije se čuvaju 6 meseci. U premium paketima, fotografije se čuvaju neograničeno vreme.",
  },
]
