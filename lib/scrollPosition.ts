// Funkcije za čuvanje i dohvatanje pozicije skrola
const SCROLL_POSITION_KEY = 'wedding_app_dashboard_scroll_position';

/**
 * Sačuvaj trenutnu poziciju skrola za dashboard
 */
export function saveScrollPosition(): void {
  if (typeof window !== 'undefined') {
    const scrollY = window.scrollY;
    localStorage.setItem(SCROLL_POSITION_KEY, scrollY.toString());
  }
}

/**
 * Dohvati sačuvanu poziciju skrola za dashboard
 * @returns Pozicija skrola ili null ako nije sačuvana
 */
export function getScrollPosition(): number | null {
  if (typeof window !== 'undefined') {
    const scrollY = localStorage.getItem(SCROLL_POSITION_KEY);
    return scrollY ? parseInt(scrollY, 10) : null;
  }
  return null;
}

/**
 * Obriši sačuvanu poziciju skrola
 */
export function clearScrollPosition(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SCROLL_POSITION_KEY);
  }
}

/**
 * Vrati korisnika na sačuvanu poziciju skrola
 * @param delay Opciono kašnjenje u milisekundama prije skrolovanja
 */
export function restoreScrollPosition(delay: number = 0): void {
  if (typeof window !== 'undefined') {
    const scrollY = getScrollPosition();
    if (scrollY !== null) {
      setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
        // Očisti poziciju nakon što je iskorištena
        clearScrollPosition();
      }, delay);
    }
  }
}
