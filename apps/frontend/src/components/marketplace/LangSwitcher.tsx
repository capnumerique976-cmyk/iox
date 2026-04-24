'use client';

import { useLang } from '@/lib/i18n';

/**
 * Toggle FR / EN — stockage localStorage, réactif via event `iox:lang:changed`.
 *
 * Volontairement minimal : deux boutons 2 lettres, état actif en gras.
 * Affiché dans le header marketplace public.
 */
export function LangSwitcher() {
  const { lang, setLang, hydrated } = useLang();
  if (!hydrated) return <span className="w-12" aria-hidden />;

  const btn = (target: 'fr' | 'en') => (
    <button
      type="button"
      onClick={() => setLang(target)}
      aria-pressed={lang === target}
      className={`rounded px-2 py-1 text-xs font-medium uppercase ${
        lang === target
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {target}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5" aria-label="Sélecteur de langue">
      {btn('fr')}
      {btn('en')}
    </div>
  );
}
