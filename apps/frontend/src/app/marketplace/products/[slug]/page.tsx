import Link from 'next/link';
import { notFound } from 'next/navigation';
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

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await fetchProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();

  const primary = product.offers.find((o) => o.isPrimaryOffer) ?? product.offers[0];

  // Autres produits du vendeur (best-effort : si l'appel échoue, on masque la section).
  const seller = await fetchSellerBySlug(product.seller.slug).catch(() => null);
  const otherProducts = (seller?.products ?? []).filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/marketplace" className="transition-colors hover:text-premium-accent">
          Catalogue
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
        {product.category && (
          <>
            <Link
              href={`/marketplace?category=${product.category.slug}`}
              className="transition-colors hover:text-premium-accent"
            >
              {product.category.nameFr}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden />
          </>
        )}
        <span className="truncate font-medium text-gray-700">{product.commercialName}</span>
      </nav>

      <article className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery */}
        <section>
          <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-premium-md">
            {product.primaryImage?.publicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.primaryImage.publicUrl}
                alt={product.primaryImage.altTextFr ?? product.commercialName}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-sky-50/40 text-gray-400">
                <ImageIcon className="h-10 w-10" aria-hidden />
                <span className="text-sm">Pas d&apos;image</span>
              </div>
            )}
          </div>
          {product.gallery.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.gallery.slice(0, 8).map(
                (m) =>
                  m.publicUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.id}
                      src={m.publicUrl}
                      alt={m.altTextFr ?? ''}
                      className="aspect-square w-full rounded-lg object-cover shadow-premium-sm ring-1 ring-gray-200/70 transition-all duration-base ease-premium hover:-translate-y-0.5 hover:ring-premium-accent/40"
                    />
                  ),
              )}
            </div>
          )}
        </section>

        {/* Details */}
        <section className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ReadinessBadge status={product.exportReadinessStatus} />
              {product.category && (
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {product.category.nameFr}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {product.commercialName}
            </h1>
            {product.subtitle && <p className="mt-1 text-base text-gray-600">{product.subtitle}</p>}
            {product.regulatoryName && (
              <p className="mt-1 text-xs text-gray-500">{product.regulatoryName}</p>
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
            className="group flex items-start gap-3 rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm transition-all duration-base ease-premium hover:-translate-y-0.5 hover:border-premium-accent/40 hover:shadow-premium-md"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-iox-primary text-sm font-bold text-white shadow-premium-sm">
              {product.seller.publicDisplayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Producteur
              </div>
              <div className="truncate font-semibold text-gray-900 group-hover:text-premium-accent">
                {product.seller.publicDisplayName}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" aria-hidden />
                {product.seller.country}
                {product.seller.region ? ` / ${product.seller.region}` : ''}
              </div>
            </div>
            <ArrowRight
              className="mt-2 h-4 w-4 flex-shrink-0 text-gray-300 transition-all duration-base group-hover:translate-x-0.5 group-hover:text-premium-accent"
              aria-hidden
            />
          </Link>

          {/* Primary offer */}
          {primary && (
            <div className="relative overflow-hidden rounded-2xl border border-premium-accent/30 bg-gradient-to-br from-sky-50/70 via-white to-white p-5 shadow-premium-md">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-premium-accent/10 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-iox-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-premium-sm">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Offre principale
                    </div>
                    <div className="mt-2 text-lg font-semibold text-gray-900">{primary.title}</div>
                    {primary.shortDescription && (
                      <p className="mt-1 text-sm text-gray-600">{primary.shortDescription}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <PriceTag offer={primary} />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {primary.moq != null && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-premium-sm">
                      <Package className="h-3.5 w-3.5 text-premium-accent" aria-hidden />
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-gray-500">MOQ</dt>
                        <dd className="font-semibold text-gray-900">
                          {primary.moq}
                          {product.defaultUnit ? ` ${product.defaultUnit}` : ''}
                        </dd>
                      </div>
                    </div>
                  )}
                  {primary.leadTimeDays != null && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-premium-sm">
                      <Clock className="h-3.5 w-3.5 text-premium-accent" aria-hidden />
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-gray-500">Délai</dt>
                        <dd className="font-semibold text-gray-900">{primary.leadTimeDays} j</dd>
                      </div>
                    </div>
                  )}
                  {primary.incoterm && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-premium-sm">
                      <Truck className="h-3.5 w-3.5 text-premium-accent" aria-hidden />
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-gray-500">
                          Incoterm
                        </dt>
                        <dd className="font-semibold text-gray-900">{primary.incoterm}</dd>
                      </div>
                    </div>
                  )}
                  {primary.departureLocation && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-premium-sm">
                      <MapPin className="h-3.5 w-3.5 text-premium-accent" aria-hidden />
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-gray-500">
                          Départ
                        </dt>
                        <dd className="truncate font-semibold text-gray-900">
                          {primary.departureLocation}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>

                <Link
                  href={`/login?redirect=${encodeURIComponent(`/quote-requests/new?offerId=${primary.id}`)}`}
                  className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-iox-primary px-4 py-3 text-sm font-semibold text-white shadow-premium-md shadow-glow-primary transition-all duration-base ease-premium hover:shadow-premium-lg active:scale-[0.98]"
                >
                  Demander un devis
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <p className="mt-2 text-center text-[11px] text-gray-500">
                  Connexion requise pour envoyer une demande
                </p>
              </div>
            </div>
          )}

          {/* Autres offres */}
          {product.offers.length > 1 && (
            <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Autres offres publiées
              </div>
              <ul className="space-y-2">
                {product.offers
                  .filter((o) => !o.isPrimaryOffer)
                  .map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50/60 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-700">{o.title}</span>
                      <PriceTag offer={o} />
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Documents publics */}
          {product.documents.length > 0 && (
            <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Documents publics
              </div>
              <ul className="space-y-1.5 text-sm">
                {product.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 text-premium-accent" aria-hidden />
                    <span className="font-medium">{d.title}</span>
                    <span className="text-xs text-gray-500">({d.documentType})</span>
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
              <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-premium-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <span className="h-4 w-1 rounded-r-full bg-gradient-iox-accent" aria-hidden />
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {product.descriptionLong}
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-premium-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className="h-4 w-1 rounded-r-full bg-gradient-iox-accent" aria-hidden />
                Caractéristiques
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                {product.varietySpecies && (
                  <>
                    <dt className="text-gray-500">Variété</dt>
                    <dd className="font-medium text-gray-800">{product.varietySpecies}</dd>
                  </>
                )}
                {product.productionMethod && (
                  <>
                    <dt className="text-gray-500">Production</dt>
                    <dd className="font-medium text-gray-800">{product.productionMethod}</dd>
                  </>
                )}
                {product.packagingDescription && (
                  <>
                    <dt className="text-gray-500">Packaging</dt>
                    <dd className="font-medium text-gray-800">{product.packagingDescription}</dd>
                  </>
                )}
                {product.storageConditions && (
                  <>
                    <dt className="text-gray-500">Stockage</dt>
                    <dd className="font-medium text-gray-800">{product.storageConditions}</dd>
                  </>
                )}
                {product.shelfLifeInfo && (
                  <>
                    <dt className="text-gray-500">DLUO</dt>
                    <dd className="font-medium text-gray-800">{product.shelfLifeInfo}</dd>
                  </>
                )}
                {product.allergenInfo && (
                  <>
                    <dt className="text-gray-500">Allergènes</dt>
                    <dd className="font-medium text-gray-800">{product.allergenInfo}</dd>
                  </>
                )}
                {product.usageTips && (
                  <>
                    <dt className="text-gray-500">Usage</dt>
                    <dd className="font-medium text-gray-800">{product.usageTips}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </section>

        {/* Autres produits du même vendeur */}
        {otherProducts.length > 0 && (
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Autres produits de {product.seller.publicDisplayName}
              </h2>
              <Link
                href={`/marketplace/sellers/${product.seller.slug}`}
                className="group flex items-center gap-1 text-xs font-semibold text-premium-accent transition-all duration-base hover:text-premium-primary"
              >
                Voir tout
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
                  className="group overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-premium-sm transition-all duration-base ease-premium hover:-translate-y-1 hover:border-premium-accent/40 hover:shadow-premium-md"
                >
                  <div className="aspect-[4/3] w-full bg-gradient-to-br from-slate-50 to-sky-50/40">
                    {p.primaryImage?.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.primaryImage.publicUrl}
                        alt={p.primaryImage.altTextFr ?? p.commercialName}
                        className="h-full w-full object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <ImageIcon className="h-8 w-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-premium-accent">
                      {p.commercialName}
                    </p>
                    {p.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{p.subtitle}</p>
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
