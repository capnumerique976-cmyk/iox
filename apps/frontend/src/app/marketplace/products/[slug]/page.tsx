import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  ChevronRight,
  ArrowRight,
  MapPin,
  Package,
  Clock,
  Truck,
  Sparkles,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { fetchProductBySlug, fetchSellerBySlug } from '@/lib/marketplace/api';
import { ReadinessBadge } from '@/components/marketplace/ReadinessBadge';
import { PriceTag } from '@/components/marketplace/PriceTag';
import { FavoriteButton } from '@/components/marketplace/FavoriteButton';
import { ShareButton } from '@/components/marketplace/ShareButton';
import { SeasonalityCalendar } from '@/components/marketplace/SeasonalityCalendar';
import { CertificationBadgeList } from '@/components/marketplace/CertificationBadgeList';
// MP-MEDIA-1 LOT 1 — galerie publique avec lightbox.
import { PublicGalleryLightbox } from '@/components/marketplace/PublicGalleryLightbox';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await fetchProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();

  // I18N-5 LOT 2.x + I18N-7 — strings publics fiche produit.
  const t = await getTranslations('marketplace.product');
  const tQuality = await getTranslations('marketplace.product.quality');
  const tCommon = await getTranslations('common');

  const primary = product.offers.find((o) => o.isPrimaryOffer) ?? product.offers[0];

  // Autres produits du vendeur (best-effort)
  const seller = await fetchSellerBySlug(product.seller.slug).catch(() => null);
  const otherProducts = (seller?.products ?? []).filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label={tCommon('breadcrumb.label')}
        className="flex flex-wrap items-center gap-1.5 text-xs text-white/50"
      >
        <Link href="/marketplace" className="transition-colors hover:text-[#00D4FF]">
          {t('breadcrumbCatalog')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-white/20" aria-hidden />
        {product.category && (
          <>
            <Link
              href={`/marketplace?category=${product.category.slug}`}
              className="transition-colors hover:text-[#00D4FF]"
            >
              {product.category.nameFr}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/20" aria-hidden />
          </>
        )}
        <span className="truncate font-medium text-white/80">{product.commercialName}</span>
      </nav>

      <article className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery */}
        <section>
          <div className="iox-glass overflow-hidden rounded-2xl">
            {product.primaryImage?.publicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.primaryImage.publicUrl}
                alt={product.primaryImage.altTextFr ?? product.commercialName}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div
                data-testid="image-placeholder"
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#12161F] to-[#0A0E1A] text-white/30"
              >
                <ImageIcon className="h-10 w-10" aria-hidden />
                <span className="text-sm">{tCommon('states.noImage')}</span>
              </div>
            )}
          </div>
          {/* MP-MEDIA-1 LOT 1 — galerie + lightbox interactif */}
          <PublicGalleryLightbox
            images={product.gallery}
            productName={product.commercialName}
          />
          {/* MP-MEDIA-1 LOT 2 — vidéo de présentation (APPROVED filtré côté backend) */}
          {product.video?.publicUrl && (
            <div data-testid="product-video" className="iox-glass mt-4 overflow-hidden rounded-2xl">
              <video
                src={product.video.publicUrl}
                controls
                preload="metadata"
                className="aspect-video w-full bg-black"
                aria-label={product.video.altTextFr ?? t('videoAriaLabel', { name: product.commercialName })}
              >
                <track kind="captions" />
              </video>
            </div>
          )}
        </section>

        {/* Details */}
        <section className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ReadinessBadge status={product.exportReadinessStatus} />
              {product.category && (
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                  {product.category.nameFr}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span className="iox-text-gradient-neon">{product.commercialName}</span>
            </h1>
            {product.subtitle && (
              <p className="mt-1 text-base text-white/70">{product.subtitle}</p>
            )}
            {product.regulatoryName && (
              <p className="mt-1 text-xs text-white/40">{product.regulatoryName}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <FavoriteButton
                productSlug={product.slug}
                commercialName={product.commercialName}
                variant="inline"
              />
              <ShareButton title={product.commercialName} />
            </div>
          </div>

          {/* Vendeur */}
          <Link
            href={`/marketplace/sellers/${product.seller.slug}`}
            className="iox-glass group flex items-start gap-3 rounded-xl p-4 transition-all duration-base ease-premium hover:-translate-y-0.5 hover:border-[#00D4FF]/40 hover:shadow-glow-cyan-sm"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-iox-neon text-sm font-bold text-white shadow-glow-cyan-sm">
              {product.seller.publicDisplayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#00D4FF]/80">
                {t('sellerLabel')}
              </div>
              <div className="truncate text-sm font-semibold text-white group-hover:text-[#00D4FF]">
                {product.seller.publicDisplayName}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                <MapPin className="h-3 w-3" aria-hidden />
                {product.seller.country}
                {product.seller.region ? ` / ${product.seller.region}` : ''}
              </div>
            </div>
            <ArrowRight
              className="mt-2 h-4 w-4 flex-shrink-0 text-white/30 transition-all duration-base group-hover:translate-x-0.5 group-hover:text-[#00D4FF]"
              aria-hidden
            />
          </Link>

          {/* Primary offer */}
          {primary && (
            <div className="relative overflow-hidden rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 via-[#12161F]/60 to-[#7B61FF]/10 p-5 shadow-glow-cyan-sm backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#00D4FF]/25 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#7B61FF]/20 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-iox-neon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-glow-cyan-sm">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {t('primaryOfferBadge')}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{primary.title}</div>
                    {primary.shortDescription && (
                      <p className="mt-1 text-sm text-white/70">{primary.shortDescription}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <PriceTag offer={primary} />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  {primary.moq != null && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                      <Package className="h-3.5 w-3.5 flex-shrink-0 text-[#00D4FF]" aria-hidden />
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">{t('fields.moq')}</dt>
                        <dd className="truncate font-semibold text-white">
                          {primary.moq}
                          {product.defaultUnit ? ` ${product.defaultUnit}` : ''}
                        </dd>
                      </div>
                    </div>
                  )}
                  {primary.leadTimeDays != null && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#00D4FF]" aria-hidden />
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">{t('fields.leadTime')}</dt>
                        <dd className="truncate font-semibold text-white">
                          {t('leadTimeDaysSuffix', { days: primary.leadTimeDays })}
                        </dd>
                      </div>
                    </div>
                  )}
                  {primary.incoterm && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                      <Truck className="h-3.5 w-3.5 flex-shrink-0 text-[#00D4FF]" aria-hidden />
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">
                          {t('fields.incoterm')}
                        </dt>
                        <dd className="truncate font-semibold text-white">{primary.incoterm}</dd>
                      </div>
                    </div>
                  )}
                  {primary.departureLocation && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#00D4FF]" aria-hidden />
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">
                          {t('fields.departure')}
                        </dt>
                        <dd className="truncate font-semibold text-white">
                          {primary.departureLocation}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>

                <Link
                  href={`/login?redirect=${encodeURIComponent(`/quote-requests/new?offerId=${primary.id}`)}`}
                  className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-iox-neon px-4 py-3 text-sm font-semibold text-white shadow-glow-cyan-sm transition-all duration-base ease-premium hover:brightness-110 hover:shadow-glow-cyan active:scale-[0.98]"
                >
                  {t('requestQuote')}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <p className="mt-2 text-center text-[11px] text-white/40">
                  {t('loginRequired')}
                </p>
              </div>
            </div>
          )}

          {/* Autres offres */}
          {product.offers.length > 1 && (
            <div className="iox-glass rounded-xl p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#00D4FF]/80">
                {t('otherOffersTitle')}
              </div>
              <ul className="space-y-2">
                {product.offers
                  .filter((o) => !o.isPrimaryOffer)
                  .map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-white/15 hover:bg-white/10"
                    >
                      <span className="text-white/80">{o.title}</span>
                      <PriceTag offer={o} />
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Documents publics */}
          {product.documents.length > 0 && (
            <div data-testid="public-documents-section" className="iox-glass rounded-xl p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#00D4FF]/80">
                {t('sections.documents')}
              </div>
              <ul className="space-y-1.5 text-sm">
                {product.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-white/80">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[#00D4FF]" aria-hidden />
                    <span className="font-medium">{d.title}</span>
                    <span className="text-xs text-white/40">({d.documentType})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Long description + specs */}
        <section className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {product.descriptionLong && (
              <div className="iox-glass relative overflow-hidden rounded-2xl p-5">
                <span
                  aria-hidden
                  className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
                />
                <h2 className="mb-3 pl-3 text-sm font-semibold text-white">{t('sections.description')}</h2>
                <p className="whitespace-pre-line pl-3 text-sm leading-relaxed text-white/75">
                  {product.descriptionLong}
                </p>
              </div>
            )}
            <div className="iox-glass relative overflow-hidden rounded-2xl p-5">
              <span
                aria-hidden
                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
              />
              <h2 className="mb-3 pl-3 text-sm font-semibold text-white">{t('sections.characteristics')}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 pl-3 text-xs">
                {product.varietySpecies && (
                  <>
                    <dt className="text-white/50">{t('fields.variety')}</dt>
                    <dd className="font-medium text-white/90">{product.varietySpecies}</dd>
                  </>
                )}
                {product.productionMethod && (
                  <>
                    <dt className="text-white/50">{t('fields.production')}</dt>
                    <dd className="font-medium text-white/90">{product.productionMethod}</dd>
                  </>
                )}
                {product.packagingDescription && (
                  <>
                    <dt className="text-white/50">{t('fields.packaging')}</dt>
                    <dd className="font-medium text-white/90">{product.packagingDescription}</dd>
                  </>
                )}
                {product.storageConditions && (
                  <>
                    <dt className="text-white/50">{t('fields.storage')}</dt>
                    <dd className="font-medium text-white/90">{product.storageConditions}</dd>
                  </>
                )}
                {product.shelfLifeInfo && (
                  <>
                    <dt className="text-white/50">{t('fields.shelfLife')}</dt>
                    <dd className="font-medium text-white/90">{product.shelfLifeInfo}</dd>
                  </>
                )}
                {product.allergenInfo && (
                  <>
                    <dt className="text-white/50">{t('fields.allergens')}</dt>
                    <dd className="font-medium text-white/90">{product.allergenInfo}</dd>
                  </>
                )}
                {product.usageTips && (
                  <>
                    <dt className="text-white/50">{t('fields.usage')}</dt>
                    <dd className="font-medium text-white/90">{product.usageTips}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* FP-6 — Origine détaillée (no-op si tous les champs sont nuls) */}
          {(product.originLocality ||
            product.altitudeMeters != null ||
            (product.gpsLat != null && product.gpsLng != null)) && (
            <div
              className="iox-glass relative mt-4 overflow-hidden rounded-2xl p-5"
              data-testid="product-fine-origin"
            >
              <span
                aria-hidden
                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
              />
              <h2 className="mb-3 pl-3 text-sm font-semibold text-white">
                {t('sections.origin')}
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 pl-3 text-xs">
                {product.originLocality && (
                  <>
                    <dt className="text-white/50">{t('fields.locality')}</dt>
                    <dd className="font-medium text-white/90">{product.originLocality}</dd>
                  </>
                )}
                {product.altitudeMeters != null && (
                  <>
                    <dt className="text-white/50">{t('fields.altitude')}</dt>
                    <dd className="font-medium text-white/90">{product.altitudeMeters} m</dd>
                  </>
                )}
                {product.gpsLat != null && product.gpsLng != null && (
                  <>
                    <dt className="text-white/50">{t('fields.gps')}</dt>
                    <dd className="font-medium text-white/90">
                      <a
                        href={`https://www.google.com/maps?q=${product.gpsLat},${product.gpsLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00D4FF] underline-offset-2 hover:underline"
                        data-testid="product-fine-origin-gps-link"
                      >
                        {product.gpsLat}, {product.gpsLng}
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* FP-8 — Logistique structurée (no-op si tout est null/vide) */}
          {((product.packagingFormats?.length ?? 0) > 0 ||
            product.temperatureRequirements ||
            product.grossWeight != null ||
            product.netWeight != null ||
            product.palletization) && (
            <div
              className="iox-glass relative mt-4 overflow-hidden rounded-2xl p-5"
              data-testid="product-logistics"
            >
              <span
                aria-hidden
                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
              />
              <h2 className="mb-3 pl-3 text-sm font-semibold text-white">{t('sections.logistics')}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 pl-3 text-xs">
                {(product.packagingFormats?.length ?? 0) > 0 && (
                  <>
                    <dt className="text-white/50">{t('fields.containers')}</dt>
                    <dd className="font-medium text-white/90">
                      {product.packagingFormats.join(', ')}
                    </dd>
                  </>
                )}
                {product.temperatureRequirements && (
                  <>
                    <dt className="text-white/50">{t('fields.temperature')}</dt>
                    <dd className="font-medium text-white/90">
                      {product.temperatureRequirements}
                    </dd>
                  </>
                )}
                {product.grossWeight != null && (
                  <>
                    <dt className="text-white/50">{t('fields.grossWeight')}</dt>
                    <dd className="font-medium text-white/90">{product.grossWeight} kg</dd>
                  </>
                )}
                {product.netWeight != null && (
                  <>
                    <dt className="text-white/50">{t('fields.netWeight')}</dt>
                    <dd className="font-medium text-white/90">{product.netWeight} kg</dd>
                  </>
                )}
                {product.palletization && (
                  <>
                    <dt className="text-white/50">{t('fields.palletization')}</dt>
                    <dd className="font-medium text-white/90">{product.palletization}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* FP-5 — Volumes et capacités (no-op si tout est null/vide) */}
          {(product.annualProductionCapacity != null ||
            product.availableQuantity != null ||
            product.restockFrequency) && (
            <div
              className="iox-glass relative mt-4 overflow-hidden rounded-2xl p-5"
              data-testid="product-volumes"
            >
              <span
                aria-hidden
                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
              />
              <h2 className="mb-3 pl-3 text-sm font-semibold text-white">
                {t('volumesTitle')}
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 pl-3 text-xs">
                {product.annualProductionCapacity != null && (
                  <>
                    <dt className="text-white/50">{t('fields.annualProduction')}</dt>
                    <dd className="font-medium text-white/90">
                      {product.annualProductionCapacity}
                      {product.capacityUnit ? ` ${product.capacityUnit}` : ''}
                    </dd>
                  </>
                )}
                {product.availableQuantity != null && (
                  <>
                    <dt className="text-white/50">{t('fields.availableStock')}</dt>
                    <dd className="font-medium text-white/90">
                      {product.availableQuantity}
                      {product.availableQuantityUnit
                        ? ` ${product.availableQuantityUnit}`
                        : ''}
                    </dd>
                  </>
                )}
                {product.restockFrequency && (
                  <>
                    <dt className="text-white/50">{t('fields.restock')}</dt>
                    <dd className="font-medium text-white/90">{product.restockFrequency}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* FP-7 — Qualité structurée (badges, no-op si tableau vide) */}
          {(product.qualityAttributes?.length ?? 0) > 0 && (
            <div
              className="iox-glass relative mt-4 overflow-hidden rounded-2xl p-5"
              data-testid="product-quality"
            >
              <span
                aria-hidden
                className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
              />
              <h2 className="mb-3 pl-3 text-sm font-semibold text-white">{t('sections.quality')}</h2>
              <div className="flex flex-wrap gap-2 pl-3">
                {product.qualityAttributes.map((attr) => (
                  <span
                    key={attr}
                    data-testid={`quality-badge-${attr}`}
                    className="inline-flex items-center rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#00D4FF]"
                  >
                    {tQuality(attr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* FP-1 — Saisonnalité (no-op si rien à afficher) */}
          <div className="mt-4">
            <SeasonalityCalendar
              availabilityMonths={product.availabilityMonths}
              harvestMonths={product.harvestMonths}
              isYearRound={product.isYearRound}
              ariaLabel={t('seasonalityAriaLabel', { name: product.commercialName })}
            />
          </div>

          {/* FP-2 — Certifications (no-op si liste vide) */}
          <div className="mt-4">
            <CertificationBadgeList
              certifications={product.certifications}
              ariaLabel={t('certificationsAriaLabel', { name: product.commercialName })}
            />
          </div>
        </section>

        {/* Autres produits du même vendeur */}
        {otherProducts.length > 0 && (
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-white">
                {t('sections.otherProducts')}
                {' — '}
                <span className="iox-text-gradient-neon">{product.seller.publicDisplayName}</span>
              </h2>
              <Link
                href={`/marketplace/sellers/${product.seller.slug}`}
                className="group flex items-center gap-1 text-xs font-semibold text-[#00D4FF] transition-all duration-base hover:text-white"
              >
                {tCommon('actions.viewAll')}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-base group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {otherProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/marketplace/products/${p.slug}`}
                  className="iox-glass group overflow-hidden rounded-xl transition-all duration-base ease-premium hover:-translate-y-1 hover:border-[#00D4FF]/40 hover:shadow-glow-cyan-sm"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#12161F] to-[#0A0E1A]">
                    {p.primaryImage?.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.primaryImage.publicUrl}
                        alt={p.primaryImage.altTextFr ?? p.commercialName}
                        className="h-full w-full object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <ImageIcon className="h-8 w-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#00D4FF]">
                      {p.commercialName}
                    </p>
                    {p.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-white/50">{p.subtitle}</p>
                    )}
                    <div className="mt-2">
                      <ReadinessBadge status={p.exportReadinessStatus} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
