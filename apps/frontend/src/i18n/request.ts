// I18N-1 phase 1 — next-intl request config (server).
//
// Lit la locale depuis le cookie `NEXT_LOCALE` (set par le
// LocaleSwitcher côté client) avec fallback sur `Accept-Language` puis
// sur la locale par défaut. Charge ensuite les messages JSON
// correspondants.
//
// Sans i18n routing, ce fichier est invoqué par le plugin `next-intl`
// pour chaque request server component.

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale, Locale } from './config';

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  // ex: "fr-FR,fr;q=0.9,en;q=0.8" → on prend la première qui matche
  const tags = header.split(',').map((s) => s.split(';')[0].trim().toLowerCase());
  for (const tag of tags) {
    const short = tag.split('-')[0];
    if (isValidLocale(short)) return short;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const fromAcceptLanguage = pickFromAcceptLanguage(headers().get('accept-language'));

  const locale: Locale = isValidLocale(fromCookie)
    ? fromCookie
    : (fromAcceptLanguage ?? DEFAULT_LOCALE);

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
