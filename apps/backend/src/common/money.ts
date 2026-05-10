/**
 * M59 — Helpers money/currency centralisés backend.
 *
 * Règles :
 * - Montants stockés en centimes (Int) dans Prisma.
 * - Devise stockée en UPPERCASE dans la DB (EUR, USD).
 * - Stripe attend la devise en lowercase (eur, usd).
 * - Pas de conversion EUR↔USD — montant affiché dans sa devise d'origine.
 */

export const SUPPORTED_CURRENCIES = ['EUR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';

/**
 * Vérifie si la devise est supportée par IOX.
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency.toUpperCase());
}

/**
 * Normalise la devise en UPPERCASE. Throws si non supportée.
 */
export function normalizeCurrency(currency?: string | null): SupportedCurrency {
  const upper = (currency ?? DEFAULT_CURRENCY).toUpperCase();
  if (!isSupportedCurrency(upper)) {
    throw new Error(`Devise non supportée : ${currency}. Devises acceptées : ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
  return upper as SupportedCurrency;
}

/**
 * Convertit des centimes en montant formaté lisible.
 * - EUR / fr-FR → "1 200,00 €"
 * - USD / fr-FR → "1 200,00 $US"
 * - USD / en-US → "$1,200.00"
 */
export function formatCents(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
  locale = 'fr-FR',
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convertit la devise en format lowercase pour Stripe API.
 */
export function toStripeCurrency(currency: string): string {
  return currency.toLowerCase();
}
