// I18N-1 phase 1 — Config locales.
//
// V1 : FR + EN. FR = locale par défaut (rétrocompat URLs existantes).
// Pas de routing locale-prefixed dans cette phase POC : la locale est
// portée par le cookie `NEXT_LOCALE` (ou `Accept-Language` au premier
// chargement).

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export function isValidLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && (LOCALES as readonly string[]).includes(value);
}
