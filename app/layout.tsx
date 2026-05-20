import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import I18nProvider, { type SupportedLocale } from "@/components/I18nProvider"
import { CookieConsent } from "@/components/CookieConsent"
import { HtmlLangSync } from "@/components/HtmlLangSync"
import { SkipLink } from "@/components/SkipLink"
import { websiteSchema, organizationSchema, faqPageSchema } from "@/lib/seo/json-ld"
import { getServerT } from "@/lib/i18n/server"

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

function resolveLocale(pathname: string): SupportedLocale {
  return pathname.startsWith('/en') ? 'en' : 'sr';
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Middleware forwards the pre-rewrite pathname via `x-pathname`. We derive
  // the locale once per request and pass it to I18nProvider as an explicit
  // prop so server and client render from the same seed, avoiding the
  // hydration mismatch that the client path-detector singleton produced.
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? '/';
  const locale = resolveLocale(pathname);
  const t = getServerT(locale);
  const ldWebsite = websiteSchema(locale);
  const ldOrganization = organizationSchema();
  const ldFaq = faqPageSchema(t);

  return (
    <html lang={locale} dir="ltr" className="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
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
          strategy="lazyOnload"
          src="https://www.googletagmanager.com/gtag/js?id=G-Y5LM1PHT8H"
        />
        {/* Inter font se učitava preko next/font/google, nije potreban preload */}
        {/* Favicon (dodaćeš public/favicon.ico po želji) */}
        <link rel="icon" href="/favicon.ico" />
        <Script id="jsonld-website" type="application/ld+json">
          {JSON.stringify(ldWebsite)}
        </Script>
        <Script id="jsonld-organization" type="application/ld+json">
          {JSON.stringify(ldOrganization)}
        </Script>
        <Script id="jsonld-faq" type="application/ld+json">
          {JSON.stringify(ldFaq)}
        </Script>
      </head>
      <body className={`${inter.className} ${playfair.variable}`}>
        <I18nProvider locale={locale} key={locale}>
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
