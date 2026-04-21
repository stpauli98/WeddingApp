// NO 'use client' - RSC.
import Link from "next/link"
import Image from "next/image"
import type { TFunction } from "i18next"
import { Instagram } from "lucide-react"
import { ScrollToTopButton } from "@/components/motion/ScrollToTopButton"

interface FooterProps {
  t: TFunction
  lang: "sr" | "en"
}

export default function Footer({ t, lang }: FooterProps) {
  void lang
  return (
    <>
      <footer className="bg-lp-muted py-12 border-t border-lp-border" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <span className="font-playfair text-xl font-bold text-lp-text">DodajUspomenu</span>
              <p className="text-sm text-lp-muted-foreground mt-2 max-w-xs">{t("footer.description")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">{t("footer.privacyPolicy")}</Link>
                <Link href="/terms" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">{t("footer.termsOfService")}</Link>
                <Link href="/kontakt" className="text-sm text-lp-muted-foreground hover:text-lp-primary transition-colors">{t("footer.contact")}</Link>
              </div>
              <div className="flex gap-4 items-start">
                <a href="https://www.instagram.com/nexrpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-muted-foreground hover:text-lp-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded" aria-label="Instagram">
                  <Instagram className="w-5 h-5" aria-hidden="true" />
                </a>
                <a href="https://www.tiktok.com/@nexrpixel.dev" target="_blank" rel="noopener noreferrer" className="text-lp-muted-foreground hover:text-lp-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded" aria-label="TikTok">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.27 0 .54.03.79.1V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.65a6.34 6.34 0 0 0 10.86 4.48 6.29 6.29 0 0 0 1.83-4.48l.01-7.66a8.16 8.16 0 0 0 4.87 1.63v-3.45a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
                <a href="https://x.com/nextpixel98" target="_blank" rel="noopener noreferrer" className="text-lp-muted-foreground hover:text-lp-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded" aria-label="X (Twitter)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true"><path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5549 21H20.7996L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-lp-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-lp-muted-foreground">
              &copy; {new Date().getFullYear()}{" "}
              <a href="https://www.nextpixel.dev/" target="_blank" rel="noopener noreferrer" className="text-lp-accent font-semibold hover:underline">Next Pixel</a>.{" "}
              {t("footer.copyright")}
            </div>
            <a href="https://www.producthunt.com/products/addmemories?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-addmemories" target="_blank" rel="noopener noreferrer" aria-label={t("a11y.productHunt")}>
              <Image src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light&t=1750169940818" alt="AddMemories on Product Hunt" width={120} height={26} style={{ width: "120px", height: "26px" }} unoptimized />
            </a>
          </div>
        </div>
      </footer>
      <ScrollToTopButton label={t("a11y.scrollTop")} />
    </>
  )
}
