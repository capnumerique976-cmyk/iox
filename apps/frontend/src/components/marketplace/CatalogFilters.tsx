'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ProductQualityAttribute,
  SeasonalityMonth,
} from '@/lib/marketplace/types';
import type { PublicCategoryNode } from '@/lib/marketplace/api';

// I18N-8 — migré de useLang vers useTranslations('marketplace.catalog').
// Quality attributes et months restent des constantes (valeurs enum),
// les labels sont résolus via les clés i18n catalog.qualityLabels.* et catalog.months.*.

// MP-CATEGORY-3 — flat category for the select dropdown.
interface FlatCategory {
  slug: string;
  label: string;
  productsCount: number;
  depth: number;
}

function flattenCategories(nodes: PublicCategoryNode[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    result.push({
      slug: node.slug,
      label: depth > 0 ? `${'— '.repeat(depth)}${node.nameFr}` : node.nameFr,
      productsCount: node.productsCount,
      depth,
    });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, depth + 1));
    }
  }
  return result;
}

const QUALITY_ATTR_VALUES: ProductQualityAttribute[] = [
  'NON_GMO', 'ORGANIC', 'HANDMADE', 'TRADITIONAL', 'HAND_HARVESTED',
  'GLUTEN_FREE', 'LACTOSE_FREE', 'VEGAN', 'VEGETARIAN', 'KOSHER',
  'HALAL', 'WILD_HARVESTED', 'SMALL_BATCH', 'COLD_PRESSED', 'RAW',
  'FAIR_TRADE', 'ARTISANAL', 'OTHER',
];

const SEASONALITY_VALUES: SeasonalityMonth[] = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export function CatalogFilters() {
  const t = useTranslations('marketplace.catalog');

  const READINESS_OPTS: Array<{ value: string; labelKey: string }> = [
    { value: '', labelKey: 'filters.all' },
    { value: 'EXPORT_READY', labelKey: 'readinessLabels.EXPORT_READY' },
    { value: 'EXPORT_READY_WITH_CONDITIONS', labelKey: 'readinessLabels.EXPORT_READY_WITH_CONDITIONS' },
    { value: 'INTERNAL_ONLY', labelKey: 'readinessLabels.INTERNAL_ONLY' },
  ];

  const PRICE_OPTS: Array<{ value: string; labelKey: string }> = [
    { value: '', labelKey: 'filters.all' },
    { value: 'FIXED', labelKey: 'priceLabels.FIXED' },
    { value: 'FROM_PRICE', labelKey: 'priceLabels.FROM_PRICE' },
    { value: 'QUOTE_ONLY', labelKey: 'priceLabels.QUOTE_ONLY' },
  ];

  const SORT_OPTS: Array<{ value: string; labelKey: string }> = [
    { value: 'featured', labelKey: 'sortLabels.featured' },
    { value: 'recent', labelKey: 'sortLabels.recent' },
    { value: 'name_asc', labelKey: 'sortLabels.nameAsc' },
    { value: 'price_asc', labelKey: 'sortLabels.priceAsc' },
    { value: 'price_desc', labelKey: 'sortLabels.priceDesc' },
    { value: 'readiness', labelKey: 'sortLabels.readiness' },
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

  // MP-CATEGORY-3 — fetch categories tree for dropdown.
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  useEffect(() => {
    fetch('/api/v1/marketplace/catalog/categories')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { data: PublicCategoryNode[] }) =>
        setCategories(flattenCategories(body.data ?? [])),
      )
      .catch(() => setCategories([]));
  }, []);

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
          {t('filters.originRegion')}
        </label>
        <input
          id="catalog-filter-region"
          data-testid="catalog-filter-originRegion"
          value={originRegion}
          onChange={(e) => setOriginRegion(e.target.value)}
          placeholder={t('filters.originRegionPlaceholder')}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-category">
          {t('filters.category')}
        </label>
        <select
          id="catalog-filter-category"
          data-testid="catalog-filter-categorySlug"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className={fieldCls}
        >
          <option value="" className="bg-[#12161F] text-white">
            {t('filters.categoryAll')}
          </option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug} className="bg-[#12161F] text-white">
              {cat.label} ({cat.productsCount})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-method">
          {t('filters.productionMethod')}
        </label>
        <input
          id="catalog-filter-method"
          data-testid="catalog-filter-productionMethod"
          value={productionMethod}
          onChange={(e) => setProductionMethod(e.target.value)}
          placeholder={t('filters.productionMethodPlaceholder')}
          className={fieldCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-quality">
          {t('filters.qualityAttribute')}
        </label>
        <select
          id="catalog-filter-quality"
          data-testid="catalog-filter-qualityAttribute"
          value={qualityAttribute}
          onChange={(e) => setQualityAttribute(e.target.value)}
          className={fieldCls}
        >
          <option value="" className="bg-[#12161F] text-white">
            {t('filters.all')}
          </option>
          {QUALITY_ATTR_VALUES.map((val) => (
            <option key={val} value={val} className="bg-[#12161F] text-white">
              {t(`qualityLabels.${val}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-season">
          {t('filters.seasonalityMonth')}
        </label>
        <select
          id="catalog-filter-season"
          data-testid="catalog-filter-seasonalityMonth"
          value={seasonalityMonth}
          onChange={(e) => setSeasonalityMonth(e.target.value)}
          className={fieldCls}
        >
          <option value="" className="bg-[#12161F] text-white">
            {t('filters.allYear')}
          </option>
          {SEASONALITY_VALUES.map((val) => (
            <option key={val} value={val} className="bg-[#12161F] text-white">
              {t(`months.${val}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="catalog-filter-temp">
          {t('filters.temperature')}
        </label>
        <input
          id="catalog-filter-temp"
          data-testid="catalog-filter-temperatureRequirements"
          value={temperatureRequirements}
          onChange={(e) => setTemperatureRequirements(e.target.value)}
          placeholder={t('filters.temperaturePlaceholder')}
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
              {t(o.labelKey)}
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
              {t(o.labelKey)}
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
        {t('filters.hasPublicDocs')}
      </label>

      <div>
        <label className={labelCls}>{t('filters.sort')}</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={fieldCls}>
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
          data-testid="catalog-filters-reset"
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
