'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { useLang } from '@/lib/i18n';

export function CatalogFilters() {
  const { t } = useLang();

  const READINESS_OPTS: Array<{ value: string; label: string }> = [
    { value: '', label: t('filters.all', 'Toutes') },
    { value: 'EXPORT_READY', label: t('readiness.EXPORT_READY') },
    { value: 'EXPORT_READY_WITH_CONDITIONS', label: t('readiness.EXPORT_READY_WITH_CONDITIONS') },
    { value: 'INTERNAL_ONLY', label: t('readiness.INTERNAL_ONLY') },
  ];

  const PRICE_OPTS: Array<{ value: string; label: string }> = [
    { value: '', label: t('filters.all', 'Tous') },
    { value: 'FIXED', label: t('price.fixed', 'Prix fixe') },
    { value: 'FROM_PRICE', label: t('price.fromPrice') },
    { value: 'QUOTE_ONLY', label: t('price.quoteOnly') },
  ];

  const SORT_OPTS: Array<{ value: string; label: string }> = [
    { value: 'featured', label: t('sort.featured', 'Recommandés') },
    { value: 'recent', label: t('sort.recent', 'Plus récents') },
    { value: 'name_asc', label: t('sort.nameAsc', 'Nom A→Z') },
    { value: 'price_asc', label: t('sort.priceAsc', 'Prix croissant') },
    { value: 'price_desc', label: t('sort.priceDesc', 'Prix décroissant') },
    { value: 'readiness', label: t('filters.readiness') },
  ];

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [country, setCountry] = useState(params.get('originCountry') ?? '');
  const [readiness, setReadiness] = useState(params.get('readiness') ?? '');
  const [priceMode, setPriceMode] = useState(params.get('priceMode') ?? '');
  const [moqMax, setMoqMax] = useState(params.get('moqMax') ?? '');
  const [sort, setSort] = useState(params.get('sort') ?? 'featured');
  const [availableOnly, setAvailableOnly] = useState(params.get('availableOnly') === 'true');

  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (country) next.set('originCountry', country);
    if (readiness) next.set('readiness', readiness);
    if (priceMode) next.set('priceMode', priceMode);
    if (moqMax) next.set('moqMax', moqMax);
    if (availableOnly) next.set('availableOnly', 'true');
    if (sort && sort !== 'featured') next.set('sort', sort);
    router.push(`${pathname}?${next.toString()}`);
  };

  const reset = () => {
    setQ('');
    setCountry('');
    setReadiness('');
    setPriceMode('');
    setMoqMax('');
    setAvailableOnly(false);
    setSort('featured');
    router.push(pathname);
  };

  const fieldCls =
    'iox-neon-input w-full rounded-lg px-2.5 py-1.5 text-sm text-white';
  const labelCls = 'mb-1 block text-xs font-medium text-white/60';

  return (
    <form
      onSubmit={submit}
      className="iox-glass sticky top-4 flex flex-col gap-3 rounded-2xl p-4 text-sm text-white"
    >
      <div>
        <label className={labelCls}>{t('filters.search')}</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls}>{t('filters.country')}</label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          placeholder="YT, FR, MG…"
          maxLength={3}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls}>{t('filters.readiness')}</label>
        <select
          value={readiness}
          onChange={(e) => setReadiness(e.target.value)}
          className={fieldCls}
        >
          {READINESS_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>{t('filters.priceMode')}</label>
        <select
          value={priceMode}
          onChange={(e) => setPriceMode(e.target.value)}
          className={fieldCls}
        >
          {PRICE_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>{t('filters.moqMax')}</label>
        <input
          type="number"
          min={0}
          value={moqMax}
          onChange={(e) => setMoqMax(e.target.value)}
          className={fieldCls}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setAvailableOnly(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#00D4FF]"
        />
        {t('filters.availableOnly')}
      </label>

      <div>
        <label className={labelCls}>{t('filters.sort')}</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={fieldCls}
        >
          {SORT_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={reset}
          className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
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
