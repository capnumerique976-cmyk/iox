'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { useLang } from '@/lib/i18n';
import type {
  ProductQualityAttribute,
  SeasonalityMonth,
} from '@/lib/marketplace/types';

// MP-FILTERS-1 — Liste des 18 valeurs FP-7 + libellés FR locaux. On
// duplique côté front pour ne pas dépendre du build serveur.
const QUALITY_ATTR_OPTIONS: Array<{ value: ProductQualityAttribute; label: string }> = [
  { value: 'NON_GMO', label: 'Sans OGM' },
  { value: 'ORGANIC', label: 'Bio' },
  { value: 'HANDMADE', label: 'Fait main' },
  { value: 'TRADITIONAL', label: 'Traditionnel' },
  { value: 'HAND_HARVESTED', label: 'Récolte manuelle' },
  { value: 'GLUTEN_FREE', label: 'Sans gluten' },
  { value: 'LACTOSE_FREE', label: 'Sans lactose' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEGETARIAN', label: 'Végétarien' },
  { value: 'KOSHER', label: 'Kasher' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'WILD_HARVESTED', label: 'Cueillette sauvage' },
  { value: 'SMALL_BATCH', label: 'Petites séries' },
  { value: 'COLD_PRESSED', label: 'Pression à froid' },
  { value: 'RAW', label: 'Cru' },
  { value: 'FAIR_TRADE', label: 'Commerce équitable' },
  { value: 'ARTISANAL', label: 'Artisanal' },
  { value: 'OTHER', label: 'Autre' },
];

const SEASONALITY_OPTIONS: Array<{ value: SeasonalityMonth; label: string }> = [
  { value: 'JAN', label: 'Janvier' },
  { value: 'FEB', label: 'Février' },
  { value: 'MAR', label: 'Mars' },
  { value: 'APR', label: 'Avril' },
  { value: 'MAY', label: 'Mai' },
  { value: 'JUN', label: 'Juin' },
  { value: 'JUL', label: 'Juillet' },
  { value: 'AUG', label: 'Août' },
  { value: 'SEP', label: 'Septembre' },
  { value: 'OCT', label: 'Octobre' },
  { value: 'NOV', label: 'Novembre' },
  { value: 'DEC', label: 'Décembre' },
];

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
  // MP-FILTERS-1 — 7 nouveaux contrôles synchronisés URL.
  const [categorySlug, setCategorySlug] = useState(params.get('categorySlug') ?? '');
  const [originRegion, setOriginRegion] = useState(params.get('originRegion') ?? '');
  const [productionMethod, setProductionMethod] = useState(params.get('productionMethod') ?? '');
  const [hasPublicDocs, setHasPublicDocs] = useState(params.get('hasPublicDocs') === 'true');
  const [seasonalityMonth, setSeasonalityMonth] = useState(params.get('seasonalityMonth') ?? '');
  const [qualityAttribute, setQualityAttribute] = useState(params.get('qualityAttribute') ?? '');
  const [temperatureRequirements, setTemperatureRequirements] = useState(
    params.get('temperatureRequirements') ?? '',
  );

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
    if (categorySlug) next.set('categorySlug', categorySlug);
    if (originRegion) next.set('originRegion', originRegion);
    if (productionMethod) next.set('productionMethod', productionMethod);
    if (hasPublicDocs) next.set('hasPublicDocs', 'true');
    if (seasonalityMonth) next.set('seasonalityMonth', seasonalityMonth);
    if (qualityAttribute) next.set('qualityAttribute', qualityAttribute);
    if (temperatureRequirements) next.set('temperatureRequirements', temperatureRequirements);
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
    setCategorySlug('');
    setOriginRegion('');
    setProductionMethod('');
    setHasPublicDocs(false);
    setSeasonalityMonth('');
    setQualityAttribute('');
    setTemperatureRequirements('');
    setSort('featured');
    router.push(pathname);
  };

  const fieldCls = 'iox-neon-input w-full rounded-lg px-2.5 py-1.5 text-sm text-white';
  const labelCls = 'mb-1 block text-xs font-medium text-white/60';

  return (
    <form
      onSubmit={submit}
      data-testid="catalog-filters"
      className="iox-glass sticky top-4 flex flex-col gap-3 rounded-2xl p-4 text-sm text-white"
    >
      <div>
        <label className={labelCls} htmlFor="catalog-filter-q">
          {t('filters.search')}
        </label>
        <input
          id="catalog-filter-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-country">
          {t('filters.country')}
        </label>
        <input
          id="catalog-filter-country"
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          placeholder="YT, FR, MG…"
          maxLength={3}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-region">
          Région d'origine
        </label>
        <input
          id="catalog-filter-region"
          data-testid="catalog-filter-originRegion"
          value={originRegion}
          onChange={(e) => setOriginRegion(e.target.value)}
          placeholder="Région, département…"
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-category">
          Catégorie (slug)
        </label>
        <input
          id="catalog-filter-category"
          data-testid="catalog-filter-categorySlug"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value.toLowerCase())}
          placeholder="epices, cafe…"
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-method">
          Méthode de production
        </label>
        <input
          id="catalog-filter-method"
          data-testid="catalog-filter-productionMethod"
          value={productionMethod}
          onChange={(e) => setProductionMethod(e.target.value)}
          placeholder="biologique, raisonné…"
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-quality">
          Qualité structurée
        </label>
        <select
          id="catalog-filter-quality"
          data-testid="catalog-filter-qualityAttribute"
          value={qualityAttribute}
          onChange={(e) => setQualityAttribute(e.target.value)}
          className={fieldCls}
        >
          <option value="" className="bg-[#12161F] text-white">
            {t('filters.all', 'Toutes')}
          </option>
          {QUALITY_ATTR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-season">
          Disponible en
        </label>
        <select
          id="catalog-filter-season"
          data-testid="catalog-filter-seasonalityMonth"
          value={seasonalityMonth}
          onChange={(e) => setSeasonalityMonth(e.target.value)}
          className={fieldCls}
        >
          <option value="" className="bg-[#12161F] text-white">
            Toute l'année
          </option>
          {SEASONALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12161F] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-temp">
          Température
        </label>
        <input
          id="catalog-filter-temp"
          data-testid="catalog-filter-temperatureRequirements"
          value={temperatureRequirements}
          onChange={(e) => setTemperatureRequirements(e.target.value)}
          placeholder="Frozen, ambiant…"
          maxLength={100}
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

      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          data-testid="catalog-filter-hasPublicDocs"
          checked={hasPublicDocs}
          onChange={(e) => setHasPublicDocs(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#00D4FF]"
        />
        Documents publics requis
      </label>

      <div>
        <label className={labelCls}>{t('filters.sort')}</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={fieldCls}>
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
