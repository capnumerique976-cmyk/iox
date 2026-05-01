'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

/**
 * MP-S-INDEX — Filtres URL-state pour l'annuaire public seller.
 * I18N-8 — migré de useLang vers useTranslations('marketplace.sellers').
 */
export function SellersFilters() {
  const t = useTranslations('marketplace.sellers');

  const SORT_OPTS: Array<{ value: string; labelKey: string }> = [
    { value: 'featured', labelKey: 'sortLabels.featured' },
    { value: 'recent', labelKey: 'sortLabels.recent' },
    { value: 'name_asc', labelKey: 'sortLabels.nameAsc' },
  ];

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [country, setCountry] = useState(params.get('country') ?? '');
  const [region, setRegion] = useState(params.get('region') ?? '');
  const [featured, setFeatured] = useState(params.get('featured') === 'true');
  const [sort, setSort] = useState(params.get('sort') ?? 'featured');

  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (country) next.set('country', country);
    if (region) next.set('region', region);
    if (featured) next.set('featured', 'true');
    if (sort && sort !== 'featured') next.set('sort', sort);
    router.push(`${pathname}?${next.toString()}`);
  };

  const reset = () => {
    setQ('');
    setCountry('');
    setRegion('');
    setFeatured(false);
    setSort('featured');
    router.push(pathname);
  };

  const fieldCls = 'iox-neon-input w-full rounded-lg px-2.5 py-1.5 text-sm text-white';
  const labelCls = 'mb-1 block text-xs font-medium text-white/60';

  return (
    <form
      onSubmit={submit}
      data-testid="sellers-filters"
      className="iox-glass sticky top-4 flex flex-col gap-3 rounded-2xl p-4 text-sm text-white"
    >
      <div>
        <label className={labelCls} htmlFor="sellers-q">
          {t('filters.search')}
        </label>
        <input
          id="sellers-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="sellers-country">
          {t('filters.country')}
        </label>
        <input
          id="sellers-country"
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          placeholder="YT, FR, MG…"
          maxLength={3}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="sellers-region">
          {t('filters.region')}
        </label>
        <input
          id="sellers-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={fieldCls}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#00D4FF]"
          data-testid="sellers-filters-featured"
        />
        {t('filters.featuredOnly')}
      </label>

      <div>
        <label className={labelCls} htmlFor="sellers-sort">
          {t('filters.sort')}
        </label>
        <select
          id="sellers-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={fieldCls}
        >
          {SORT_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={reset}
          className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
          data-testid="sellers-filters-reset"
        >
          {t('filters.reset')}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-gradient-iox-neon px-3 py-1.5 text-sm font-medium text-white shadow-glow-cyan-sm transition-all duration-base ease-premium hover:brightness-110 hover:shadow-glow-cyan active:scale-[0.98]"
        >
          {t('filters.apply')}
        </button>
      </div>
    </form>
  );
}
