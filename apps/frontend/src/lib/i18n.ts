'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * i18n bridge — gestion langue FR/EN via localStorage + cookie NEXT_LOCALE.
 *
 * I18N-8 — DICT supprimé, toutes les traductions passent par next-intl
 * (messages/fr.json + en.json). Ce module ne conserve que le mécanisme
 * setLang (localStorage + cookie + reload) utilisé par LangSwitcher.
 */

export type Lang = 'fr' | 'en';
const STORAGE_KEY = 'iox:lang';

function readLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>('fr');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLangState(readLang());
    setHydrated(true);
    const refresh = () => setLangState(readLang());
    window.addEventListener('iox:lang:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('iox:lang:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent('iox:lang:changed'));
      // Bridge vers next-intl : poser le cookie NEXT_LOCALE pour que les
      // server components (next-intl/server) restent en sync.
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* quota — no-op */
    }
    setLangState(next);
    // Force reload pour rafraîchir les server components RSC.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  return { lang, setLang, hydrated };
}
