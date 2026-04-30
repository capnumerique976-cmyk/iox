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
import { authStorage } from '@/lib/auth';
import { api } from '@/lib/api';

export function LocaleSwitcher() {
  const t = useTranslations('common.language');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchLocale = (next: Locale) => {
    if (next === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // I18N-3 — si user authentifié, persister la préférence côté DB.
    // Best-effort : si le PATCH échoue, le cookie reste posé donc l'UI
    // reste cohérente jusqu'au prochain login.
    const token = authStorage.getAccessToken();
    if (token) {
      api
        .patch<{ id: string }>('/users/me/locale', { locale: next }, token)
        .catch(() => {
          /* silent — cookie déjà posé, UI reste cohérente */
        });
    }
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-xs backdrop-blur-sm"
      role="group"
      aria-label={t('label')}
      data-testid="locale-switcher"
    >
      <Languages className="h-3 w-3 text-white/50" aria-hidden />
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
            className={`rounded px-1.5 py-0.5 font-medium uppercase transition-colors ${
              active
                ? 'bg-[#00D4FF]/20 text-[#00D4FF] ring-1 ring-[#00D4FF]/30'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            } disabled:opacity-50`}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
