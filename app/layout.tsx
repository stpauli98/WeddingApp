import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import I18nProvider from "@/components/I18nProvider"
import { CookieConsent } from "@/components/CookieConsent"
import { HtmlLangSync } from "@/components/HtmlLangSync"
import { SkipLink } from "@/components/SkipLink"

const inter = Inter({ subsets: ["latin"] })
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DodajUspomenu",
  description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.dodajuspomenu.com"),
  verification: {
    google: "MsLpENmJbTy5jvgQo2Jk1H31j7VqnVCxNJlip5IHPs8",
  },
  openGraph: {
    title: "DodajUspomenu - Digitalni svadbeni album",
    description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
    url: "https://dodajuspomenu.com",
    siteName: "DodajUspomenu",
    images: [
      {
        url: "/seo-cover.png",
        width: 1200,
        height: 630,
        alt: "DodajUspomenu - Digitalni svadbeni album",
      },
    ],
    locale: "sr_RS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DodajUspomenu - Digitalni svadbeni album",
    description: "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene.",
    images: ["/seo-cover.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
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
        {/* Google Analytics with Consent Mode v2 (denied by default) */}
        <Script id="gtag-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            });
            gtag('js', new Date());
            gtag('config', 'G-Y5LM1PHT8H', { anonymize_ip: true });
          `}
        </Script>
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-Y5LM1PHT8H"
        />
        {/* Inter font se učitava preko next/font/google, nije potreban preload */}
        {/* Favicon (dodaćeš public/favicon.ico po želji) */}
        <link rel="icon" href="/favicon.ico" />
        {/* Preload hero image — next/image priority auto-preload does not
            propagate through FadeInUpOnMount client island, so add an explicit
            hint so the browser fetches it during document parse. The SR version
            is the default landing hero; EN visitors briefly fetch an unused SR
            copy but the LCP gain outweighs the penalty. */}
        <link
          rel="preload"
          as="image"
          href="/_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=640&q=75"
          imageSrcSet="/_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=384&q=75 384w, /_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=640&q=75 640w"
          fetchPriority="high"
        />
        {/* JSON-LD: WebSite schema */}
        <Script id="jsonld-website" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "DodajUspomenu",
            "url": "https://www.dodajuspomenu.com/",
            "description": "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmena fotografija sa venčanja."
          })}
        </Script>
        {/* Organization schema */}
        <Script id="jsonld-organization" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "DodajUspomenu",
            "url": "https://www.dodajuspomenu.com/",
            "logo": "https://www.dodajuspomenu.com/seo-cover.png",
            "sameAs": [
              "https://www.facebook.com/dodajuspomenu",
              "https://www.instagram.com/dodajuspomenu"
            ],
            "contactPoint": [{
              "@type": "ContactPoint",
              "email": "kontakt@dodajuspomenu.com",
              "contactType": "customer support",
              "url": "https://www.dodajuspomenu.com/kontakt"
            }]
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
                  "text": "Za razliku od društvenih mreža, naša aplikacija omogućava privatno deljenje fotografija samo sa osobama kojima vi dozvolite pristup. Sve fotografije su organizovane na jednom mestu, u visokoj rezoluciji, i lako ih je preuzeti."
                }
              },
              {
                "@type": "Question",
                "name": "Koje su prednosti korišćenja ove aplikacije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Jednostavnost korišćenja, privatnost, prikupljanje fotografija od svih gostiju na jednom mestu, bez instalacije aplikacije, i mogućnost preuzimanja svih slika odjednom."
                }
              },
              {
                "@type": "Question",
                "name": "Koliko košta korišćenje aplikacije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Besplatan paket nudi do 3 slike po gostu za do 20 gostiju. Osnovni paket je €25 (7 slika po gostu, do 100 gostiju). Premium je €75 (25 slika po gostu, do 300 gostiju, originalni kvalitet)."
                }
              },
              {
                "@type": "Question",
                "name": "Da li gosti moraju da kreiraju naloge?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Ne. Gosti skeniraju QR kod i mogu odmah da otpremaju fotografije bez registracije i bez instalacije aplikacije."
                }
              },
              {
                "@type": "Question",
                "name": "Koliko dugo se čuvaju fotografije?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Slike se čuvaju 30 dana od datuma venčanja u svim paketima. Mladenci u tom roku preuzimaju ZIP sa svim fotografijama."
                }
              }
            ]
          })}
        </Script>
      </head>
      <body className={`${inter.className} ${playfair.variable}`}>
        <I18nProvider>
          <HtmlLangSync />
          <SkipLink />
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <main id="main-content" className="min-h-screen bg-background" role="main" tabIndex={-1}>{children}</main>
            {/* Toaster koristi aria-live za pristupačnost */}
            <div aria-live="polite" aria-atomic="true">
              <Toaster />
            </div>
            <CookieConsent />
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
