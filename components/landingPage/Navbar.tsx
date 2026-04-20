import Link from "next/link"
import type { TFunction } from "i18next"
import LanguageSelector from "@/components/LanguageSelector"
import { NavbarIsland } from "@/components/motion/NavbarIsland"

interface NavbarProps {
  t: TFunction
  lang: "sr" | "en"
}

export default function Navbar({ t, lang }: NavbarProps) {
  const navLinks = [
    { label: t("navbar.howItWorks"), href: "#kako-radi" },
    { label: t("navbar.faq"), href: "#faq" },
  ]

  const desktopTail = (
    <>
      <LanguageSelector className="text-sm" />
      <Link
        href={`/${lang}/admin/register`}
        className="px-5 py-2 text-sm font-semibold text-white bg-lp-primary rounded-lg hover:bg-lp-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
      >
        {t("navbar.cta")}
      </Link>
    </>
  )

  const mobileTail = (
    <>
      <LanguageSelector className="text-sm w-full" />
      <Link
        href={`/${lang}/admin/register`}
        className="block w-full text-center px-5 py-3 text-sm font-semibold text-white bg-lp-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
      >
        {t("navbar.cta")}
      </Link>
    </>
  )

  return (
    <NavbarIsland
      mainNavLabel={t("a11y.mainNav")}
      menuOpenLabel={t("navbar.menuOpen")}
      menuCloseLabel={t("navbar.menuClose")}
      navLinks={navLinks}
      desktopTail={desktopTail}
      mobileTail={mobileTail}
      brandHref="/"
      brandLabel="DodajUspomenu"
    />
  )
}
