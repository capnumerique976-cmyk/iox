'use client';

// I18N-1 phase 1 — LocaleSwitcher.
//
// Composant client qui set le cookie `NEXT_LOCALE` et reload la page
// pour forcer next-intl à recharger les messages côté serveur.
//
// Sans i18n routing, on s'appuie purement sur le cookie ; aucune
// modification d'URL.

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { LOCALES, LOCALE_COOKIE_NAME, type Locale } from '@/i18n/config';

export function LocaleSwitcher() {
  const t = useTranslations('common.language');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchLocale = (next: Locale) => {
    if (next === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs"
      role="group"
      aria-label={t('label')}
      data-testid="locale-switcher"
    >
      <Languages className="h-3 w-3 text-gray-400" aria-hidden />
      {LOCALES.map((loc) => {
        const active = loc === currentLocale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchLocale(loc)}
            aria-pressed={active}
            disabled={pending}
            data-testid={`locale-switch-${loc}`}
            className={`rounded px-1.5 py-0.5 font-medium uppercase ${
              active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
