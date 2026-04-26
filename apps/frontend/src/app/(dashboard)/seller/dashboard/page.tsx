'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Tag,
} from 'lucide-react';
import { MarketplacePublicationStatus, QuoteRequestStatus, UserRole } from '@iox/shared';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { PageHeader } from '@/components/ui/page-header';

/**
 * Cockpit vendeur marketplace — vue synthétique 1 écran.
 *
 * Agrège, pour l'utilisateur MARKETPLACE_SELLER courant (l'API scope
 * automatiquement au sellerProfile rattaché) :
 * - comptes produits / offres par statut de publication
 * - état du profil vendeur (le premier rattaché)
 * - RFQ entrantes par statut (NEW / NEGOTIATING)
 * - documents marketplace non vérifiés ou arrivant à expiration (90 j)
 *
 * Zéro mutation, uniquement orientation + deep-links vers les écrans
 * existants (profil, documents, RFQ).
 */

const CAN_VIEW = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER] as const;

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; value: T }
  | { status: 'error'; message: string };

interface CountBucket {
  total: number;
  byStatus: Record<string, number>;
}

interface OfferRow {
  id: string;
  title: string;
  publicationStatus: MarketplacePublicationStatus;
  exportReadinessStatus: string;
  updatedAt: string;
}
interface ProductRow {
  id: string;
  commercialName: string;
  publicationStatus: MarketplacePublicationStatus;
  updatedAt: string;
}
interface ListResponse<T> {
  data: T[];
  meta: { total: number };
}

interface DocumentRow {
  id: string;
  title: string;
  documentType: string;
  verificationStatus: string;
  validUntil: string | null;
}

interface SellerProfileRow {
  id: string;
  publicDisplayName: string;
  status: string;
  slug: string | null;
  descriptionShort: string | null;
  descriptionLong: string | null;
  salesEmail: string | null;
  website: string | null;
  logoMediaId: string | null;
  bannerMediaId: string | null;
  supportedIncoterms: unknown;
  destinationsServed: unknown;
  averageLeadTimeDays: number | null;
}

interface CompletionCriterion {
  key: string;
  label: string;
  done: boolean;
  hint?: string;
}

function completionCriteria(p: SellerProfileRow): CompletionCriterion[] {
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return [
    {
      key: 'short',
      label: 'Description courte',
      done: !!(p.descriptionShort && p.descriptionShort.length >= 20),
    },
    {
      key: 'long',
      label: 'Description détaillée',
      done: !!(p.descriptionLong && p.descriptionLong.length >= 80),
    },
    { key: 'email', label: 'Email commercial', done: !!p.salesEmail },
    { key: 'logo', label: 'Logo', done: !!p.logoMediaId },
    { key: 'incoterms', label: 'Incoterms supportés', done: arr(p.supportedIncoterms).length > 0 },
    {
      key: 'destinations',
      label: 'Destinations servies',
      done: arr(p.destinationsServed).length > 0,
    },
  ];
}

export default function SellerDashboardPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState<LoadState<OfferRow[]>>({ status: 'loading' });
  const [products, setProducts] = useState<LoadState<ProductRow[]>>({ status: 'loading' });
  const [rfq, setRfq] = useState<LoadState<QuoteRequestSummary[]>>({ status: 'loading' });
  const [docs, setDocs] = useState<LoadState<DocumentRow[]>>({ status: 'loading' });
  const [profile, setProfile] = useState<LoadState<SellerProfileRow | null>>({ status: 'loading' });

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken() ?? '';
    setOffers({ status: 'loading' });
    setProducts({ status: 'loading' });
    setRfq({ status: 'loading' });
    setDocs({ status: 'loading' });
    setProfile({ status: 'loading' });

    api
      .get<ListResponse<OfferRow>>('/marketplace/offers?limit=100', token)
      .then((r) => setOffers({ status: 'ok', value: r.data }))
      .catch((e) => setOffers({ status: 'error', message: msg(e) }));

    api
      .get<ListResponse<ProductRow>>('/marketplace/products?limit=100', token)
      .then((r) => setProducts({ status: 'ok', value: r.data }))
      .catch((e) => setProducts({ status: 'error', message: msg(e) }));

    quoteRequestsApi
      .list(token, { limit: '100' })
      .then((r) => setRfq({ status: 'ok', value: r.data }))
      .catch((e) => setRfq({ status: 'error', message: msg(e) }));

    api
      .get<ListResponse<DocumentRow>>('/marketplace/documents?limit=100', token)
      .then((r) => setDocs({ status: 'ok', value: r.data }))
      .catch((e) => setDocs({ status: 'error', message: msg(e) }));

    api
      .get<ListResponse<SellerProfileRow>>('/marketplace/seller-profiles?limit=5', token)
      .then((r) => setProfile({ status: 'ok', value: r.data[0] ?? null }))
      .catch((e) => setProfile({ status: 'error', message: msg(e) }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const offerCounts = useMemo<CountBucket>(
    () => bucket(offers, (o) => o.publicationStatus),
    [offers],
  );
  const productCounts = useMemo<CountBucket>(
    () => bucket(products, (p) => p.publicationStatus),
    [products],
  );
  const rfqCounts = useMemo<CountBucket>(() => bucket(rfq, (q) => q.status), [rfq]);

  // Documents qui demandent une action : non-vérifiés ou expirant sous 90 jours.
  // Contenus rejetés (produits + offres) — requièrent action.
  const rejectedOffers = useMemo(
    () =>
      offers.status === 'ok'
        ? offers.value.filter((o) => o.publicationStatus === MarketplacePublicationStatus.REJECTED)
        : [],
    [offers],
  );
  const rejectedProducts = useMemo(
    () =>
      products.status === 'ok'
        ? products.value.filter(
            (p) => p.publicationStatus === MarketplacePublicationStatus.REJECTED,
          )
        : [],
    [products],
  );

  // 3 demandes les plus récentes (NEW ou NEGOTIATING en priorité).
  const recentRfq = useMemo(() => {
    if (rfq.status !== 'ok') return [] as QuoteRequestSummary[];
    const score = (s: QuoteRequestStatus) =>
      s === QuoteRequestStatus.NEW ? 0 : s === QuoteRequestStatus.NEGOTIATING ? 1 : 2;
    return [...rfq.value]
      .sort((a, b) => {
        const sc = score(a.status) - score(b.status);
        if (sc !== 0) return sc;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 3);
  }, [rfq]);

  const completion = useMemo(() => {
    if (profile.status !== 'ok' || !profile.value) return null;
    const crits = completionCriteria(profile.value);
    const done = crits.filter((c) => c.done).length;
    return { crits, done, total: crits.length };
  }, [profile]);

  const docAlerts = useMemo(() => {
    if (docs.status !== 'ok')
      return { expiring: [] as DocumentRow[], pending: [] as DocumentRow[] };
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const expiring = docs.value.filter((d) => {
      if (!d.validUntil) return false;
      const t = new Date(d.validUntil).getTime();
      return t - now <= ninetyDays && t - now >= 0;
    });
    const pending = docs.value.filter(
      (d) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'REJECTED',
    );
    return { expiring, pending };
  }, [docs]);

  if (user && !CAN_VIEW.includes(user.role as (typeof CAN_VIEW)[number])) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Votre rôle ne permet pas d&apos;accéder au cockpit vendeur. Contactez un administrateur si vous pensez que c&apos;est une erreur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Store className="h-5 w-5" aria-hidden />}
        title="Cockpit vendeur marketplace"
        subtitle="Synthèse de votre activité marketplace : publications, demandes de devis, conformité documentaire."
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <RefreshCw className="h-4 w-4" /> Rafraîchir
          </button>
        }
      />

      {/* Profil vendeur */}
      <section className="space-y-2">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Profil vendeur</h2>
        {profile.status === 'loading' && <Skeleton h="h-20" />}
        {profile.status === 'error' && <ErrorLine message={profile.message} />}
        {profile.status === 'ok' && profile.value === null && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            Aucun profil vendeur actif n&apos;est rattaché à votre compte. Contactez l&apos;équipe
            IOX pour finaliser votre onboarding.
          </div>
        )}
        {profile.status === 'ok' && profile.value && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{profile.value.publicDisplayName}</p>
              <p className="text-xs text-gray-500">
                Statut :{' '}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(profile.value.status)}`}
                >
                  {profile.value.status}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* FP-3 — accès direct à l'auto-édition du profil. */}
              <Link
                href="/seller/profile/edit"
                className="inline-flex items-center gap-1 rounded-md border border-premium-accent/40 bg-premium-accent/5 px-2.5 py-1.5 text-xs font-medium text-premium-accent hover:bg-premium-accent/10"
              >
                Éditer mon profil <ArrowRight className="h-3 w-3" />
              </Link>
              {profile.value.slug && (
                <Link
                  href={`/marketplace/sellers/${profile.value.slug}`}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Voir fiche publique <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Score de complétude du profil vendeur */}
      {completion && (
        <section className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Complétude du profil vendeur</h2>
            <span className="text-xs font-semibold tabular-nums text-gray-600">
              {completion.done} / {completion.total}
            </span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all ${
                completion.done === completion.total
                  ? 'bg-emerald-500'
                  : completion.done >= completion.total / 2
                    ? 'bg-amber-500'
                    : 'bg-orange-500'
              }`}
              style={{ width: `${Math.round((completion.done / completion.total) * 100)}%` }}
            />
          </div>
          <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {completion.crits.map((c) => (
              <li
                key={c.key}
                className={`inline-flex items-center gap-2 rounded px-2 py-1 ${
                  c.done ? 'text-emerald-700' : 'text-gray-500'
                }`}
              >
                {c.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                <span className={c.done ? 'line-through decoration-emerald-300' : ''}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cartes analytics */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Package className="h-5 w-5 text-blue-600" />}
          title="Produits"
          state={products}
          total={productCounts.total}
          lines={[
            ['Publiés', productCounts.byStatus[MarketplacePublicationStatus.PUBLISHED] ?? 0],
            ['En revue', productCounts.byStatus[MarketplacePublicationStatus.IN_REVIEW] ?? 0],
            ['Brouillons', productCounts.byStatus[MarketplacePublicationStatus.DRAFT] ?? 0],
          ]}
          emptyHint="Aucun produit marketplace pour l'instant."
        />
        <StatCard
          icon={<Tag className="h-5 w-5 text-emerald-600" />}
          title="Offres"
          state={offers}
          total={offerCounts.total}
          lines={[
            ['Publiées', offerCounts.byStatus[MarketplacePublicationStatus.PUBLISHED] ?? 0],
            ['En revue', offerCounts.byStatus[MarketplacePublicationStatus.IN_REVIEW] ?? 0],
            ['Suspendues', offerCounts.byStatus[MarketplacePublicationStatus.SUSPENDED] ?? 0],
          ]}
          emptyHint="Aucune offre active."
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5 text-orange-600" />}
          title="Demandes de devis"
          state={rfq}
          total={rfqCounts.total}
          lines={[
            ['Nouvelles', rfqCounts.byStatus[QuoteRequestStatus.NEW] ?? 0],
            ['Négociation', rfqCounts.byStatus[QuoteRequestStatus.NEGOTIATING] ?? 0],
            ['Gagnées', rfqCounts.byStatus[QuoteRequestStatus.WON] ?? 0],
          ]}
          emptyHint="Aucune demande entrante."
          cta={{ href: '/quote-requests', label: 'Ouvrir la file RFQ' }}
        />
      </section>

      {/* Contenus rejetés : produits / offres (si > 0) */}
      {(rejectedProducts.length > 0 || rejectedOffers.length > 0) && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertCircle className="h-4 w-4" /> Contenus rejetés à retravailler
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rejectedProducts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Produits rejetés ({rejectedProducts.length})
                </p>
                <ul className="space-y-1 text-xs text-amber-900">
                  {rejectedProducts.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span className="truncate font-medium">{p.commercialName}</span>
                      <Link
                        href={`/products/${p.id}`}
                        className="flex-shrink-0 underline hover:no-underline"
                      >
                        Corriger
                      </Link>
                    </li>
                  ))}
                  {rejectedProducts.length > 5 && (
                    <li className="italic opacity-70">+ {rejectedProducts.length - 5} autre(s)</li>
                  )}
                </ul>
              </div>
            )}
            {rejectedOffers.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Offres rejetées ({rejectedOffers.length})
                </p>
                <ul className="space-y-1 text-xs text-amber-900">
                  {rejectedOffers.slice(0, 5).map((o) => (
                    <li key={o.id} className="flex items-center justify-between">
                      <span className="truncate font-medium">{o.title}</span>
                      <Link
                        href={`/marketplace/offers/${o.id}`}
                        className="flex-shrink-0 underline hover:no-underline"
                      >
                        Corriger
                      </Link>
                    </li>
                  ))}
                  {rejectedOffers.length > 5 && (
                    <li className="italic opacity-70">+ {rejectedOffers.length - 5} autre(s)</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Demandes récentes à traiter (top 3) */}
      {rfq.status === 'ok' && recentRfq.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ShoppingBag className="h-4 w-4 text-orange-600" /> Demandes à traiter
            </h2>
            <Link
              href="/quote-requests"
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Voir toutes <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100 text-sm">
            {recentRfq.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{q.marketplaceOffer.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {q.buyerCompany?.name ?? '—'}
                    {' · '}
                    {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      q.status === QuoteRequestStatus.NEW
                        ? 'bg-blue-100 text-blue-800'
                        : q.status === QuoteRequestStatus.NEGOTIATING
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {q.status}
                  </span>
                  <Link
                    href={`/quote-requests/${q.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Ouvrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Alertes documents */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <FileText className="h-4 w-4" /> Conformité documentaire
        </h2>

        {docs.status === 'loading' && <Skeleton h="h-24" />}
        {docs.status === 'error' && <ErrorLine message={docs.message} />}
        {docs.status === 'ok' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AlertBlock
              tone="orange"
              icon={<Clock className="h-4 w-4" />}
              title={`Expirent sous 90 jours (${docAlerts.expiring.length})`}
              items={docAlerts.expiring.map((d) => ({
                id: d.id,
                label: d.title,
                detail: d.validUntil
                  ? `expire le ${new Date(d.validUntil).toLocaleDateString('fr-FR')}`
                  : '—',
              }))}
              emptyLabel="Aucun document n'expire à court terme."
            />
            <AlertBlock
              tone="blue"
              icon={<AlertCircle className="h-4 w-4" />}
              title={`Non vérifiés (${docAlerts.pending.length})`}
              items={docAlerts.pending.map((d) => ({
                id: d.id,
                label: d.title,
                detail: d.verificationStatus,
              }))}
              emptyLabel="Tous vos documents sont vérifiés."
            />
          </div>
        )}
        <div className="mt-3 text-right">
          <Link
            href="/seller/documents"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Gérer mes documents <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Raccourcis */}
      <section className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Raccourcis</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          <QuickLink href="/seller/profile/edit" label="Éditer mon profil vendeur" />
          <QuickLink href="/seller/marketplace-products" label="Mes produits marketplace" />
          <QuickLink href="/quote-requests" label="Demandes de devis" />
          <QuickLink href="/seller/documents" label="Documents marketplace" />
          <QuickLink href="/marketplace" label="Voir le catalogue public" />
        </div>
      </section>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function msg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Chargement impossible';
}

function bucket<T>(state: LoadState<T[]>, key: (t: T) => string): CountBucket {
  if (state.status !== 'ok') return { total: 0, byStatus: {} };
  const byStatus: Record<string, number> = {};
  for (const item of state.value) {
    const k = key(item);
    byStatus[k] = (byStatus[k] ?? 0) + 1;
  }
  return { total: state.value.length, byStatus };
}

function statusTone(s: string): string {
  switch (s) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800';
    case 'PENDING_REVIEW':
      return 'bg-amber-100 text-amber-800';
    case 'SUSPENDED':
      return 'bg-red-100 text-red-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function Skeleton({ h }: { h: string }) {
  return <div className={`w-full rounded-lg border border-gray-200 bg-white ${h} animate-pulse`} />;
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4" /> {message}
    </div>
  );
}

function StatCard({
  icon,
  title,
  state,
  total,
  lines,
  emptyHint,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  state: LoadState<unknown[]>;
  total: number;
  lines: Array<[string, number]>;
  emptyHint: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm transition-shadow duration-base ease-premium hover:shadow-premium-md">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {icon} {title}
        </div>
        <span className="rounded-full bg-premium-accent/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-premium-accent">
          {state.status === 'ok' ? total : '…'}
        </span>
      </div>

      {state.status === 'loading' && <div className="h-16 animate-pulse rounded-lg bg-gray-100" />}
      {state.status === 'error' && <ErrorLine message={state.message} />}
      {state.status === 'ok' && total === 0 && <p className="text-xs text-gray-400">{emptyHint}</p>}
      {state.status === 'ok' && total > 0 && (
        <ul className="space-y-1 text-xs text-gray-700">
          {lines.map(([label, n]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      )}

      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-premium-accent transition-colors duration-fast ease-premium hover:text-premium-primary"
        >
          {cta.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function AlertBlock({
  tone,
  icon,
  title,
  items,
  emptyLabel,
}: {
  tone: 'orange' | 'blue';
  icon: React.ReactNode;
  title: string;
  items: Array<{ id: string; label: string; detail: string }>;
  emptyLabel: string;
}) {
  const toneClass =
    tone === 'orange'
      ? 'border-orange-200 bg-orange-50 text-orange-800'
      : 'border-blue-200 bg-blue-50 text-blue-800';
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-1 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" /> {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-1 text-xs">
          {items.slice(0, 5).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{it.label}</span>
              <span className="flex-shrink-0 opacity-80">{it.detail}</span>
            </li>
          ))}
          {items.length > 5 && <li className="italic opacity-70">+ {items.length - 5} autre(s)</li>}
        </ul>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
    >
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}
