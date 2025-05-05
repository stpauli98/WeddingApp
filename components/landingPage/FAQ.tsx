import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQ() {
  return (
    <section className="py-20">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-primary mb-3">Najčešća pitanja</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            Odgovori na pitanja koja nas najčešće pitaju
          </p>
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

const faqItems = [
  {
    question: "Zašto bih koristio ovu aplikaciju umjesto društvenih mreža?",
    answer:
      "Za razliku od društvenih mreža, ovdje su vaše slike potpuno privatne i dostupne samo gostima kojima vi pošaljete link ili QR kod. Nema javnog dijeljenja, nema miješanja sa tuđim sadržajem, niti rizika od curenja fotografija.",
  },
  {
    question: "Koje su prednosti korištenja ove aplikacije?",
    answer:
      "Aplikacija je jednostavna za korištenje, ne traži instalaciju, a svi gosti mogu uploadovati slike direktno sa svojih telefona ili računara. Sve slike su organizovane po gostima i događajima, čuvaju se u punoj rezoluciji na sigurnom cloud servisu (Cloudinary), i dostupne su samo vama i vašim gostima.",
  },
  {
    question: "Nije li jednostavnije koristiti WhatsApp ili Viber grupu?",
    answer:
      "WhatsApp i Viber automatski smanjuju kvalitet slika i miješaju ih sa drugim porukama. Naša aplikacija čuva slike u originalnoj rezoluciji, bez kompresije, i omogućava mladencima da sve slike i poruke preuzmu ili sačuvaju na jednom mjestu, bez haosa i gubitaka.",
  },
  {
    question: "Koliko košta korištenje aplikacije?",
    answer:
      "Trenutno nudimo besplatno korištenje za sve korisnike dok je aplikacija u beta fazi. U budućnosti će postojati osnovni besplatan paket sa limitom na broj slika, te premium paketi za veća vjenčanja i dodatne opcije (npr. duže čuvanje slika, veći broj gostiju, napredna administracija).",
  },
  {
    question: "Da li gosti moraju kreirati naloge?",
    answer:
      "Ne. Gosti ne moraju imati nalog niti instalirati aplikaciju. Dovoljno je da unesu ime, prezime i email, dobiju verifikacioni kod i odmah mogu uploadovati slike i ostaviti poruku – sve potpuno jednostavno i sigurno.",
  },
  {
    question: "Koliko dugo se čuvaju slike?",
    answer:
      "U beta fazi slike se čuvaju najmanje 6 mjeseci. Nakon izlaska iz beta verzije, osnovni paket će omogućavati čuvanje slika 6 mjeseci, dok će premium paketi omogućiti duže ili neograničeno čuvanje, ovisno o potrebama korisnika.",
  },
]

