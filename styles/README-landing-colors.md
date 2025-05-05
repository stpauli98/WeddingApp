# Landing Page Boje

Sve landing page boje su definisane u `styles/landing-colors.css` kao CSS custom properties. Kada želiš da promijeniš boju na cijelom landing page-u, samo promijeni vrijednost u ovom fajlu i sve će se automatski ažurirati!

**Primjeri boja:**
- `--lp-primary`: Plava (dugmad, istaknuti tekst)
- `--lp-primary-foreground`: Zlatna (tekst na plavoj podlozi)
- `--lp-bg`: Bijela pozadina
- `--lp-muted`: Svijetla zlatna (za sekcije ili naglaske)
- `--lp-accent`: Zlatna (borderi, ikone)
- `--lp-text`: Tamno plava (glavni tekst)
- `--lp-card`: Bijela (kartice)
- `--lp-card-foreground`: Tamno plava (tekst na karticama)

**Korištenje u Tailwind klasama:**
- `bg-lp-primary`, `text-lp-primary-foreground`, `border-lp-accent`, `bg-lp-muted`, `text-lp-text`, ...

**Promjena boje:**
1. Promijeni vrijednost u `landing-colors.css` (npr. --lp-primary).
2. Tailwind klase automatski koriste nove vrijednosti.

**Ne zaboravi:**
- Importuj `styles/landing-colors.css` u svoj `globals.css` ili root layout.
