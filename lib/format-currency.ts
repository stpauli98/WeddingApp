/**
 * Format a cent amount as EUR currency, localized per app language.
 * Shared by landing Pricing cards and FAQ so price copy always matches
 * the DB-driven pricing values (no hardcoded "€25" strings).
 */
export function formatCurrency(amountCents: number, lang: "sr" | "en"): string {
  return new Intl.NumberFormat(lang === "sr" ? "sr-RS" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100)
}
