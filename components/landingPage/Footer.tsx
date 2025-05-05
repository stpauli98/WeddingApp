import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Facebook, Twitter, Heart } from "lucide-react"
import FooterCommentForm from "./FooterCommentForm"

export default function Footer() {
  return (
    <footer className="bg-lp-bg text-lp-text py-16 border-t border-lp-accent">
      <div className="container px-6 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold text-lp-primary mb-6">Sačuvajte sve uspomene sa vašeg vjenčanja</h3>
            <p className="text-lp-text mb-6 max-w-md">
              Pridružite se stotinama parova koji su koristili našu aplikaciju za prikupljanje fotografija sa svog vjenčanja.
            </p>
            <div className="flex gap-4">
              <Link href="/admin/register" className="px-8 py-4 rounded-lg font-semibold bg-lp-primary text-lp-primary-foreground hover:bg-lp-accent hover:text-white transition-colors">
                Započnite besplatno
              </Link>
            </div>
          </div>
          <FooterCommentForm />
        </div>
       

        <div className="border-t border-lp-accent pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-lp-text/70 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} <a href="https://www.nextpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-accent font-semibold hover:underline">Next Pixel</a>. Sva prava zadržana.
          </div>

          <div className="flex gap-6">
            <Link href="https://instagram.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Instagram className="w-5 h-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link href="https://facebook.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Facebook className="w-5 h-5" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link href="https://tiktok.com" className="text-lp-text/70 hover:text-lp-accent transition-colors">
              <Twitter className="w-5 h-5" />
              <span className="sr-only">TikTok</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-lp-text/70 text-sm flex items-center justify-center">
          Napravljeno sa <Heart className="w-4 h-4 text-lp-accent mx-1 fill-lp-accent" /> za sve buduće mladence
        </div>
      </div>
    </footer>
  )
}
