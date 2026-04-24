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

  return (
    <form
      onSubmit={submit}
      className="sticky top-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          {t('filters.search')}
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          {t('filters.country')}
        </label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          placeholder="YT, FR, MG…"
          maxLength={3}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          {t('filters.readiness')}
        </label>
        <select
          value={readiness}
          onChange={(e) => setReadiness(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        >
          {READINESS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          {t('filters.priceMode')}
        </label>
        <select
          value={priceMode}
          onChange={(e) => setPriceMode(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        >
          {PRICE_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          {t('filters.moqMax')}
        </label>
        <input
          type="number"
          min={0}
          value={moqMax}
          onChange={(e) => setMoqMax(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setAvailableOnly(e.target.checked)}
        />
        {t('filters.availableOnly')}
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">{t('filters.sort')}</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        >
          {SORT_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={reset}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {t('filters.reset')}
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('filters.apply')}
        </button>
      </div>
    </form>
  );
}
