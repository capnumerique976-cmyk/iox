import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin, Clock, Globe2, Ship, Package } from 'lucide-react';
import { fetchSellerBySlug } from '@/lib/marketplace/api';
import { ReadinessBadge } from '@/components/marketplace/ReadinessBadge';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function SellerPage({ params }: PageProps) {
  const seller = await fetchSellerBySlug(params.slug).catch(() => null);
  if (!seller) notFound();

  const languages = Array.isArray(seller.languages) ? (seller.languages as string[]) : [];
  const incoterms = Array.isArray(seller.supportedIncoterms)
    ? (seller.supportedIncoterms as string[])
    : [];
  const destinations = Array.isArray(seller.destinationsServed)
    ? (seller.destinationsServed as string[])
    : [];

  const location = [seller.country, seller.region, seller.cityOrZone].filter(Boolean).join(' · ');
  const initials = seller.publicDisplayName.slice(0, 2).toUpperCase();

  return (
    <article className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/marketplace" className="transition-colors hover:text-premium-primary">
          Catalogue
        </Link>
        <ChevronRight className="h-3 w-3 text-gray-400" aria-hidden />
        <span className="font-medium text-gray-700">{seller.publicDisplayName}</span>
      </nav>

      {/* Header / hero vendeur */}
      <header className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-premium-sm">
        {seller.banner?.publicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seller.banner.publicUrl} alt="" className="h-44 w-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="relative h-32 w-full overflow-hidden bg-gradient-iox-primary"
          >
            <div className="absolute -top-12 -right-10 h-48 w-48 rounded-full bg-premium-accent/25 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          </div>
        )}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          {seller.logo?.publicUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seller.logo.publicUrl}
              alt={seller.publicDisplayName}
              className="-mt-14 h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-premium-md"
            />
          ) : (
            <div
              aria-hidden
              className="-mt-14 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-iox-primary text-xl font-semibold text-white shadow-premium-md"
            >
              {initials}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {seller.publicDisplayName}
            </h1>
            {location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-premium-accent" aria-hidden />
                {location}
              </p>
            )}
            {seller.descriptionShort && (
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                {seller.descriptionShort}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {languages.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                  <Globe2 className="h-3 w-3" aria-hidden />
                  {languages.join(' · ')}
                </span>
              )}
              {seller.averageLeadTimeDays != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-premium-accent/20 bg-premium-accent/5 px-2.5 py-1 font-medium text-premium-accent">
                  <Clock className="h-3 w-3" aria-hidden />
                  Délai ~ {seller.averageLeadTimeDays} j
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-600">
                <Package className="h-3 w-3" aria-hidden />
                {seller.products.length} produit{seller.products.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Story / Description */}
      {(seller.descriptionLong || seller.story) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {seller.descriptionLong && (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-premium-sm">
              <span
                aria-hidden
                className="absolute left-0 top-4 bottom-4 w-1 rounded-r bg-gradient-iox-accent"
              />
              <h2 className="mb-2 pl-3 text-sm font-semibold text-gray-900">À propos</h2>
              <p className="whitespace-pre-line pl-3 text-sm leading-relaxed text-gray-700">
                {seller.descriptionLong}
              </p>
            </div>
          )}
          {seller.story && (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-premium-sm">
              <span
                aria-hidden
                className="absolute left-0 top-4 bottom-4 w-1 rounded-r bg-gradient-iox-accent"
              />
              <h2 className="mb-2 pl-3 text-sm font-semibold text-gray-900">Histoire</h2>
              <p className="whitespace-pre-line pl-3 text-sm leading-relaxed text-gray-700">
                {seller.story}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Export capabilities */}
      {(incoterms.length > 0 || destinations.length > 0) && (
        <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-premium-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Ship className="h-4 w-4 text-premium-accent" aria-hidden />
            Capacités export
          </h2>
          <dl className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {incoterms.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                  Incoterms supportés
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {incoterms.map((i) => (
                    <span
                      key={i}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {i}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {destinations.length > 0 && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                  Destinations servies
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {destinations.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-premium-accent/20 bg-premium-accent/5 px-2.5 py-1 text-xs font-medium text-premium-accent"
                    >
                      {d}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Produits publiés */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Produits publiés
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({seller.products.length})
            </span>
          </h2>
        </div>
        {seller.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-gray-400" aria-hidden />
            <p className="mt-2 text-sm text-gray-600">Aucun produit publié pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seller.products.map((p) => (
              <Link
                key={p.id}
                href={`/marketplace/products/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-premium-sm transition-all duration-base ease-premium hover:-translate-y-0.5 hover:border-premium-accent/40 hover:shadow-premium-md"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {p.primaryImage?.publicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.primaryImage.publicUrl}
                      alt={p.primaryImage.altTextFr ?? p.commercialName}
                      className="h-full w-full object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="mb-1.5">
                    <ReadinessBadge status={p.exportReadinessStatus} />
                  </div>
                  <h3 className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-premium-accent">
                    {p.commercialName}
                  </h3>
                  {p.subtitle && (
                    <p className="truncate text-xs text-gray-500">{p.subtitle}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3 text-premium-accent/70" aria-hidden />
                    {p.originCountry}
                    {p.originRegion ? ` / ${p.originRegion}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
