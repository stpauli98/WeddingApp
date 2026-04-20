# Guest Gallery — Swipe Lightbox + Body Scroll Lock

**Date:** 2026-04-19
**Owner:** @stpauli98
**Status:** Approved, ready for implementation planning

## Context

Guest upload je zelen (PR #3 merged). Međutim UX/UI pregleda uploadovanih slika je loš i curi scroll na modal-ima. Tri prijavljena problema:

1. **Nema swipe navigacije u galeriji.** Trenutni `ImageGallery.tsx` prikazuje grid; klik na thumbnail otvara fullscreen prikaz **jedne** slike bez mogućnosti prelaska na sljedeću. User mora zatvoriti → kliknuti drugu. Na phone-u je ovo nepodnošljivo: 25 slika × 2 tapa = 50 interakcija umjesto swipe-a.
2. **Scroll leakage u fullscreen prikazu slike** ([ImageGallery.tsx:172-208](components/guest/ImageGallery.tsx#L172-L208)). `<div className="fixed inset-0 bg-black/80 z-50">` ne lockuje body scroll. Korisnik može scroll-ovati stranicu ispod (vidi se i kroz overlay).
3. **Scroll leakage u upload progress modal-u** ([Upload-Form.tsx:365-406](components/guest/Upload-Form.tsx#L365-L406)). Isti uzrok — modal je fixed, ali body scroll nije zaustavljen. `overscroll-contain` dodan u prethodnom fix-u sprečava touch chaining unutar modal-a, ali ne zaustavlja scroll iza njega.

**Cilj:** phone-first swipe lightbox + jedan `useLockBodyScroll` hook koji gasi scroll leak na oba modal-a.

## Non-goals

- Pinch-to-zoom (user odluka 2026-04-19: "B" — bez zoom-a u prvoj verziji)
- Desktop-only features (arrows UI, thumbnails strip) — dodaju se samo ako su trivijalne (keyboard ← → je ~3 linije, to da; vizualne strelice + strip preskačemo)
- Share/download dugme u lightbox-u
- Preload susjednih slika (embla to radi po default-u)
- Admin galerija izmjene — iako `SwipeLightbox` treba biti reusable, admin surface ostaje netaknut u ovoj iteraciji

## Design

### Arhitektura

**Novi fajlovi:**
- `components/shared/SwipeLightbox.tsx` — fullscreen swipe viewer, reusable
- `hooks/useLockBodyScroll.ts` — body scroll lock while `active=true`

**Izmijenjeni fajlovi:**
- `components/guest/ImageGallery.tsx` — zamijeniti postojeći fullscreen div sa `<SwipeLightbox>`; migrirati inline delete na `fetchWithCsrfRetry` iz `lib/csrf-client.ts`
- `components/guest/Upload-Form.tsx` — pozvati `useLockBodyScroll(showUploadStatus)` pored postojećeg modal-a

**Biblioteka:** `embla-carousel-react@8.5.1` (već u `package.json` dependencies-u, nigdje nije korištena). Headless engine pokriva swipe, momentum, touch gestures, keyboard navigaciju i index state.

### `SwipeLightbox` komponenta

```ts
type SwipeLightboxProps = {
  images: Array<{ id: string; imageUrl: string }>;
  startIndex: number;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>; // izostavi → read-only
};
```

**UX ponašanje (phone-first):**

| Interakcija | Rezultat |
|---|---|
| Swipe ←/→ | embla carousel pomjera na susjednu sliku; loop off |
| Swipe ↓ preko ~80px | `onClose()` (iOS Photos gesture) |
| Tap crna pozadina | `onClose()` |
| Tap slika | ništa (da se ne zatvara slučajno) |
| X dugme gore-desno | `onClose()` |
| Delete gore-lijevo (uz potvrdu) | poziva `onDelete(currentId)`; poslije uspjeha pomjera index na sljedeću ili zatvara ako je bila zadnja |
| Keyboard ← → | mijenja sliku (desktop fallback) |
| Keyboard ESC | `onClose()` |
| Counter dole-center | `N / total` |

**Vizualno:**
- `fixed inset-0 z-50 bg-black/95`
- Slika `object-contain`, max-width + max-height viewport
- Framer Motion (već u deps-u) za fade-in modal i cross-fade između slika (≤200ms)
- `ImageWithSpinner` (postojeća) za loading state
- Body scroll locked cijelo vrijeme mount-a

### `useLockBodyScroll` hook

```ts
// hooks/useLockBodyScroll.ts
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const originalOverflow = body.style.overflow;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = '';
    };
  }, [active]);
}
```

**Što radi:**
- `overflow: hidden` na body → zaustavlja page scroll iza modal-a
- `padding-right` kompenzacija scrollbar width-a → sprečava layout shift na desktop-u (mobile: overlay scrollbar, width=0, bez uticaja)
- Cleanup vraća originalne vrijednosti pa se modali ne slažu destruktivno

### Integracija

| Surface | Poziv |
|---|---|
| `SwipeLightbox` interno | `useLockBodyScroll(true)` |
| `Upload-Form.tsx` upload status modal | `useLockBodyScroll(showUploadStatus)` |

### Delete flow iz lightbox-a

`ImageGallery.tsx:41-101` trenutno ima inline `handleDelete` koji fetcuje CSRF token bez retry-ja. Migracija:

```ts
import { fetchWithCsrfRetry } from '@/lib/csrf-client';

const res = await fetchWithCsrfRetry(
  `/api/guest/images/delete?id=${imageId}`,
  { method: 'DELETE', csrfEndpoint: '/api/guest/images/delete' }
);
```

Na uspjeh: ažuriraj lokalni array, pomjeri lightbox index na sljedeću ili `onClose()` ako prazna lista. Error state se prikazuje postojećim `setError`.

## Testing

**Unit (Jest + RTL):**
- `useLockBodyScroll` — verifikuj `body.style.overflow` postaje `'hidden'` na `active=true`, vraća se na cleanup-u, handluje re-run sa `active=false`
- `SwipeLightbox` smoke — render sa 3 slike, assert index state mijenja na programski next/prev (embla API), X dugme poziva `onClose`

**E2E (Playwright):**
- Preskačemo — swipe gestures nepouzdano u Playwright-u, scroll lock se vidi samo manuelno. Unit pokriva logiku, ručni QA pokriva gesture.

**Manual QA:**
1. Guest dashboard na phone-u (Network IP), 5+ slika, tap → lightbox swipe kroz sve → X zatvara
2. Body iza lightbox-a ne scroll-uje
3. Upload 10 slika, dok su u toku tab mora ostati locked u modal-u, ispod se ne pomjera
4. Delete iz lightbox-a — slika nestaje, lightbox ide na sljedeću ili zatvara

## Out of scope za ovaj PR (followups)

- Pinch-to-zoom
- Thumbnails strip u lightbox-u
- Admin gallery migracija na SwipeLightbox
- Analytics na swipe eventima
- Share/download button
