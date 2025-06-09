import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import I18nProvider from "@/components/I18nProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DodajUspomenu",
  description: "Aplikacija za goste na svadbi",
  generator: 'v0.dev',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // U Next.js App Routeru, jezik se automatski postavlja na osnovu strukture direktorija
  // Ovdje ne možemo direktno pristupiti URL-u jer je ovo server komponenta
  // Jezik će se postaviti na klijentskoj strani u I18nProvider komponenti

  return (
    <html lang="sr" dir="ltr" className="light" style={{ colorScheme: "light" }}>
      <head>
        {/* Inter font se učitava preko next/font/google, nije potreban preload */}
        {/* Favicon (dodaćeš public/favicon.ico po želji) */}
        <link rel="icon" href="/favicon.ico" />
        {/* JSON-LD structured data for WebSite and Event */}
        <Script id="jsonld-website" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "DodajUspomenu",
            "url": "https://mojasvadbaa.com/",
            "description": "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmena fotografija sa venčanja."
          })}
        </Script>
        <Script id="jsonld-event" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "DodajUspomenu – Digitalni svadbeni album",
            "startDate": "2025-05-04",
            "location": {
              "@type": "Place",
              "name": "Online platforma",
              "url": "https://mojasvadbaa.com/"
            },
            "description": "Aplikacija za digitalno prikupljanje i deljenje slika i čestitki sa svadbi."
          })}
        </Script>
        {/* Organization schema */}
        <Script id="jsonld-organization" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "DodajUspomenu",
            "url": "https://mojasvadbaa.com/",
            "logo": "https://mojasvadbaa.com/seo-cover.png",
            "sameAs": [
              "https://www.facebook.com/mojasvadbaa",
              "https://www.instagram.com/mojasvadbaa"
            ],
            "contactPoint": [{
              "@type": "ContactPoint",
              "email": "kontakt@mojasvadbaa.com",
              "contactType": "customer support",
              "url": "https://mojasvadbaa.com/kontakt"
            }]
          })}
        </Script>
        {/* BreadcrumbList schema */}
        <Script id="jsonld-breadcrumb" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Početna",
                "item": "https://mojasvadbaa.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Registracija",
                "item": "https://mojasvadbaa.com/admin/register"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Prijava",
                "item": "https://mojasvadbaa.com/admin/login"
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": "Dashboard",
                "item": "https://mojasvadbaa.com/dashboard"
              }
            ]
          })}
        </Script>
        {/* Example Review schema for homepage */}
        <Script id="jsonld-review" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Review",
            "itemReviewed": {
              "@type": "WebSite",
              "name": "DodajUspomenu",
              "url": "https://mojasvadbaa.com/"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "author": {
              "@type": "Person",
              "name": "Ana M."
            },
            "reviewBody": "Predivna aplikacija! Svi gosti su lako uploadovali slike i mladenci su oduševljeni. Preporuka za svaku svadbu!"
          })}
        </Script>
        <Script id="jsonld-faq" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Zašto bih koristio ovu aplikaciju umesto društvenih mreža?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Za razliku od društvenih mreža, naša aplikacija omogućava privatno deljenje fotografija samo sa osobama kojima vi dozvolite pristup. Takođe, sve fotografije su organizovane na jednom mestu, u visokoj rezoluciji i lako ih je preuzeti."
                }
              },
              {
                "@type": "Question",
                "name": "Koje su prednosti korišćenja ove aplikacije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Glavne prednosti su jednostavnost korišćenja, privatnost, mogućnost prikupljanja fotografija od svih gostiju na jednom mestu, bez potrebe za instalacijom aplikacije, i mogućnost preuzimanja svih fotografija u originalnoj rezoluciji."
                }
              },
              {
                "@type": "Question",
                "name": "Nije li jednostavnije koristiti WhatsApp ili Viber grupu?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "WhatsApp i Viber grupe imaju ograničenja u pogledu kvaliteta fotografija (kompresija), ograničenog prostora za skladištenje i organizacije. Naša aplikacija čuva fotografije u originalnoj rezoluciji, nema ograničenja u broju fotografija i sve je organizovano na jednom mestu."
                }
              },
              {
                "@type": "Question",
                "name": "Koliko košta korišćenje aplikacije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Nudimo besplatni osnovni paket koji uključuje do 500 fotografija. Za veća venčanja, imamo premium pakete koji počinju od 29€ sa neograničenim brojem fotografija i dodatnim funkcionalnostima."
                }
              },
              {
                "@type": "Question",
                "name": "Da li gosti moraju da kreiraju naloge?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Ne, to je jedna od glavnih prednosti naše aplikacije. Gosti jednostavno skeniraju QR kod i mogu odmah da otpremaju fotografije bez registracije ili instaliranja bilo čega."
                }
              },
              {
                "@type": "Question",
                "name": "Koliko dugo se čuvaju fotografije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "U osnovnom paketu, fotografije se čuvaju 6 meseci. U premium paketima, fotografije se čuvaju neograničeno vreme."
                }
              }
            ]
          })}
        </Script>
      </head>
      <body className={inter.className}>
        {/* Skip to main content link for a11y */}
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-primary text-white px-4 py-2 rounded z-50">Preskoči na glavni sadržaj</a>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <main id="main-content" className="min-h-screen bg-background" role="main" tabIndex={-1}>{children}</main>
            {/* Toaster koristi aria-live za pristupačnost */}
            <div aria-live="polite" aria-atomic="true">
              <Toaster />
            </div>
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
