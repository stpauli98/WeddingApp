import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Instagram, Facebook, Twitter, Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container px-4 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-6">Sačuvajte sve uspomene sa vašeg venčanja</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Pridružite se stotinama parova koji su koristili našu aplikaciju za prikupljanje fotografija sa svog
              venčanja.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-6 h-auto rounded-lg"
              >
                Započnite besplatno
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Pretplatite se na naš newsletter</h3>
            <p className="text-gray-400 mb-4">Budite u toku sa najnovijim funkcionalnostima i ponudama</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="Vaša email adresa" className="bg-gray-800 border-gray-700 text-white" />
              <Button className="bg-rose-600 hover:bg-rose-700">Pretplatite se</Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Wedding Photo App. Sva prava zadržana.
          </div>

          <div className="flex gap-6">
            <Link href="https://instagram.com" className="text-gray-400 hover:text-white transition-colors">
              <Instagram className="w-5 h-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link href="https://facebook.com" className="text-gray-400 hover:text-white transition-colors">
              <Facebook className="w-5 h-5" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link href="https://tiktok.com" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
              <span className="sr-only">TikTok</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm flex items-center justify-center">
          Napravljeno sa <Heart className="w-4 h-4 text-rose-500 mx-1 fill-rose-500" /> za sve buduće mladence
        </div>
      </div>
    </footer>
  )
}
