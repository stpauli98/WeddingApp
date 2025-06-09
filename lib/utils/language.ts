/**
 * Lista podržanih jezika u aplikaciji
 */
export const SUPPORTED_LANGUAGES = ['sr', 'en'];

/**
 * Funkcija koja dobija trenutni jezik iz URL putanje
 * @param path - URL putanja (opciono) - ako nije proslijeđena, koristi se window.location.pathname
 * @param defaultLanguage - Zadani jezik koji se vraća ako jezik nije pronađen ili nije podržan
 * @returns Trenutni jezik (sr ili en)
 */
export function getCurrentLanguageFromPath(path?: string, defaultLanguage = 'sr'): string {
  // Ako smo na klijentskoj strani i path nije proslijeđen, koristi window.location.pathname
  const pathToUse = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  
  // Ako nemamo putanju, vrati zadani jezik
  if (!pathToUse) {
    return defaultLanguage;
  }
  
  // Dobavi prvi segment putanje (nakon prvog /)
  const segments = pathToUse.split('/');
  const langSegment = segments.length > 1 ? segments[1] : '';
  
  // Provjeri je li segment jezika podržan
  return SUPPORTED_LANGUAGES.includes(langSegment) ? langSegment : defaultLanguage;
}
