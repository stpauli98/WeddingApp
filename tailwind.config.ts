import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /* Osnovne boje */
        "lp-primary": "hsl(var(--lp-primary))",
        "lp-primary-foreground": "hsl(var(--lp-primary-foreground))",
        "lp-bg": "hsl(var(--lp-bg))",
        "lp-muted": "hsl(var(--lp-muted))",
        "lp-accent": "hsl(var(--lp-accent))",
        "lp-text": "hsl(var(--lp-text))",
        "lp-card": "hsl(var(--lp-card))",
        "lp-card-foreground": "hsl(var(--lp-card-foreground))",
        
        /* Dodatne boje */
        "lp-secondary": "hsl(var(--lp-secondary))",
        "lp-secondary-foreground": "hsl(var(--lp-secondary-foreground))",
        "lp-muted-foreground": "hsl(var(--lp-muted-foreground))",
        "lp-border": "hsl(var(--lp-border))",
        "lp-input": "hsl(var(--lp-input))",
        "lp-ring": "hsl(var(--lp-ring))",
        
        /* Funkcionalne boje */
        "lp-destructive": "hsl(var(--lp-destructive))",
        "lp-destructive-foreground": "hsl(var(--lp-destructive-foreground))",
        "lp-success": "hsl(var(--lp-success))",
        "lp-success-foreground": "hsl(var(--lp-success-foreground))",
        "lp-warning": "hsl(var(--lp-warning))",
        "lp-warning-foreground": "hsl(var(--lp-warning-foreground))",
        
        /* Hover stanja */
        "lp-primary-hover": "hsl(var(--lp-primary-hover))",
        "lp-accent-hover": "hsl(var(--lp-accent-hover))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
