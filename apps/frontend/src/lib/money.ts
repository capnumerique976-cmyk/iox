/**
 * M59 — Helpers money/currency centralisés frontend.
 *
 * Règles :
 * - Montants stockés en centimes (number) — diviser par 100 pour afficher.
 * - Devise en UPPERCASE (EUR, USD) dans les données API.
 * - Pas de conversion EUR↔USD — montant affiché dans sa devise d'origine.
 * - Locale par défaut : fr-FR (IOX est un produit français).
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
 * Normalise la devise (fallback sur EUR si manquante ou non supportée).
 * Ne lance pas d'exception côté frontend — fallback silencieux.
 */
export function normalizeCurrency(currency?: string | null): SupportedCurrency {
  if (!currency) return DEFAULT_CURRENCY;
  const upper = currency.toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}

/**
 * Formate des centimes en montant lisible avec devise.
 *
 * Exemples (fr-FR) :
 * - EUR : `1 200,00 €`
 * - USD : `1 200,00 $US`
 *
 * @param cents   - montant en centimes (entier)
 * @param currency - devise (EUR, USD, …) — fallback EUR
 * @param locale  - locale (défaut fr-FR)
 */
export function formatCents(
  cents: number,
  currency: string | null | undefined = DEFAULT_CURRENCY,
  locale = 'fr-FR',
): string {
  const normalizedCurrency = normalizeCurrency(currency);
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un montant décimal (ex: unitPrice depuis l'API) avec devise.
 * Utiliser pour les prix d'offre (Decimal Prisma retourné en string).
 *
 * @param amount   - montant en unités (ex: "42.50" ou 42.5)
 * @param currency - devise — fallback EUR
 * @param locale   - locale — défaut fr-FR
 */
export function formatAmount(
  amount: string | number | null | undefined,
  currency: string | null | undefined = DEFAULT_CURRENCY,
  locale = 'fr-FR',
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  const normalizedCurrency = normalizeCurrency(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
  }).format(n);
}
