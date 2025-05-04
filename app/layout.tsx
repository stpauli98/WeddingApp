import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DodajUspomenu",
  description: "Aplikacija za goste na svadbi",
  generator: 'v0.dev',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" dir="ltr" className="light" style={{ colorScheme: "light" }}>
      <head>
        {/* Inter font se učitava preko next/font/google, nije potreban preload */}
        {/* Favicon (dodaćeš public/favicon.ico po želji) */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        {/* Skip to main content link for a11y */}
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-primary text-white px-4 py-2 rounded z-50">Preskoči na glavni sadržaj</a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <main id="main-content" className="min-h-screen bg-background" role="main" tabIndex={-1}>{children}</main>
          {/* Toaster koristi aria-live za pristupačnost */}
          <div aria-live="polite" aria-atomic="true">
            <Toaster />
          </div>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
