'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Link2,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { getMembershipsDiagnostic, MembershipsDiagnostic } from '@/lib/memberships';
import { sellerProfilesApi } from '@/lib/seller-profiles';
import { quoteRequestsApi } from '@/lib/quote-requests';
import { SellerProfileStatus, QuoteRequestStatus } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';

/**
 * Tableau de bord administrateur.
 *
 * Vue agrégée sur les zones critiques du back-office :
 * - Santé des rattachements (sellers orphelins).
 * - Profils vendeurs par statut (bénéficie pour déblocages).
 * - File de revue marketplace (pending par type).
 * - Demandes de devis en attente / en cours.
 *
 * Implémentation : toutes les requêtes agrégées sont déclenchées en
 * parallèle via `Promise.allSettled` pour qu'un incident localisé ne
 * masque pas le reste du tableau. Chaque carte a son propre état
 * (loading / success / failure) pour que l'admin puisse continuer à
 * piloter même si une partie des stats est momentanément indisponible.
 */

interface ReviewPendingStats {
  total: number;
  byType: { publication: number; media: number; document: number };
}

interface SellerCounts {
  total: number;
  pendingReview: number;
  approved: number;
  suspended: number;
  rejected: number;
  draft: number;
  featured: number;
}

interface RfqCounts {
  total: number;
  pending: number; // NEW + QUALIFIED + NEGOTIATING
  quoted: number;
  won: number;
  lost: number;
}

interface AgedReviewItem {
  id: string;
  reviewType: string;
  entityType: string;
  createdAt: string;
  ageDays: number;
}

interface ExpiringDoc {
  id: string;
  title: string;
  documentType: string;
  validUntil: string | null;
  daysLeft: number;
  sellerProfileId?: string | null;
}

interface RiskSummary {
  agedReviews: AgedReviewItem[];
  expiringDocs: ExpiringDoc[];
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; value: T }
  | { status: 'error'; message: string };

const initialLoading: LoadState<unknown> = { status: 'loading' };

export default function AdminDashboardPage() {
  const [memberships, setMemberships] = useState<LoadState<MembershipsDiagnostic>>(
    initialLoading as LoadState<MembershipsDiagnostic>,
  );
  const [sellers, setSellers] = useState<LoadState<SellerCounts>>(
    initialLoading as LoadState<SellerCounts>,
  );
  const [reviews, setReviews] = useState<LoadState<ReviewPendingStats>>(
    initialLoading as LoadState<ReviewPendingStats>,
  );
  const [rfq, setRfq] = useState<LoadState<RfqCounts>>(initialLoading as LoadState<RfqCounts>);
  const [risks, setRisks] = useState<LoadState<RiskSummary>>(
    initialLoading as LoadState<RiskSummary>,
  );
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken() ?? '';
    setMemberships({ status: 'loading' });
    setSellers({ status: 'loading' });
    setReviews({ status: 'loading' });
    setRfq({ status: 'loading' });

    // Memberships diagnostic (1 call)
    getMembershipsDiagnostic(token)
      .then((d) => setMemberships({ status: 'ok', value: d }))
      .catch((e) => setMemberships({ status: 'error', message: errorMessage(e) }));

    // Seller profiles — 1 call par statut + featured. On utilise limit=1
    // pour ne récupérer que `meta.total`.
    (async () => {
      try {
        const statuses: SellerProfileStatus[] = [
          SellerProfileStatus.DRAFT,
          SellerProfileStatus.PENDING_REVIEW,
          SellerProfileStatus.APPROVED,
          SellerProfileStatus.SUSPENDED,
          SellerProfileStatus.REJECTED,
        ];
        const [draft, pending, approved, suspended, rejected, featured] = await Promise.all([
          ...statuses.map((s) => sellerProfilesApi.list(token, { status: s, limit: 1 })),
          sellerProfilesApi.list(token, { isFeatured: true, limit: 1 }),
        ]);
        const total =
          draft.meta.total +
          pending.meta.total +
          approved.meta.total +
          suspended.meta.total +
          rejected.meta.total;
        setSellers({
          status: 'ok',
          value: {
            total,
            draft: draft.meta.total,
            pendingReview: pending.meta.total,
            approved: approved.meta.total,
            suspended: suspended.meta.total,
            rejected: rejected.meta.total,
            featured: featured.meta.total,
          },
        });
      } catch (e) {
        setSellers({ status: 'error', message: errorMessage(e) });
      }
    })();

    // Review queue
    api
      .get<ReviewPendingStats>('/marketplace/review-queue/stats/pending', token)
      .then((d) => setReviews({ status: 'ok', value: d }))
      .catch((e) => setReviews({ status: 'error', message: errorMessage(e) }));

    // RFQ — ventilation par statut.
    (async () => {
      try {
        const [newR, qualified, negotiating, quoted, won, lost] = await Promise.all([
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.NEW, limit: '1' }),
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.QUALIFIED, limit: '1' }),
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.NEGOTIATING, limit: '1' }),
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.QUOTED, limit: '1' }),
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.WON, limit: '1' }),
          quoteRequestsApi.list(token, { status: QuoteRequestStatus.LOST, limit: '1' }),
        ]);
        setRfq({
          status: 'ok',
          value: {
            total:
              newR.meta.total +
              qualified.meta.total +
              negotiating.meta.total +
              quoted.meta.total +
              won.meta.total +
              lost.meta.total,
            pending: newR.meta.total + qualified.meta.total + negotiating.meta.total,
            quoted: quoted.meta.total,
            won: won.meta.total,
            lost: lost.meta.total,
          },
        });
      } catch (e) {
        setRfq({ status: 'error', message: errorMessage(e) });
      }
    })();

    // Risk summary — aged pending reviews (> 7 j) + documents expirant (< 30 j).
    (async () => {
      setRisks({ status: 'loading' });
      try {
        const [pendingQueue, allDocs] = await Promise.all([
          api.get<{
            data: Array<{
              id: string;
              reviewType: string;
              entityType: string;
              status: string;
              createdAt: string;
            }>;
            meta: { total: number };
          }>('/marketplace/review-queue?status=PENDING&limit=100', token),
          api.get<{
            data: Array<{
              id: string;
              title: string;
              documentType: string;
              validUntil: string | null;
              sellerProfileId?: string | null;
            }>;
            meta: { total: number };
          }>('/marketplace/documents?limit=200', token),
        ]);
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const agedReviews: AgedReviewItem[] = pendingQueue.data
          .map((it) => {
            const ageDays = Math.floor((now - new Date(it.createdAt).getTime()) / DAY);
            return {
              id: it.id,
              reviewType: it.reviewType,
              entityType: it.entityType,
              createdAt: it.createdAt,
              ageDays,
            };
          })
          .filter((it) => it.ageDays >= 7)
          .sort((a, b) => b.ageDays - a.ageDays)
          .slice(0, 10);

        const expiringDocs: ExpiringDoc[] = [];
        for (const d of allDocs.data) {
          if (!d.validUntil) continue;
          const daysLeft = Math.ceil((new Date(d.validUntil).getTime() - now) / DAY);
          if (daysLeft < 0 || daysLeft > 30) continue;
          expiringDocs.push({
            id: d.id,
            title: d.title,
            documentType: d.documentType,
            validUntil: d.validUntil,
            daysLeft,
            sellerProfileId: d.sellerProfileId ?? null,
          });
        }
        expiringDocs.sort((a, b) => a.daysLeft - b.daysLeft);
        expiringDocs.splice(10);

        setRisks({ status: 'ok', value: { agedReviews, expiringDocs } });
      } catch (e) {
        setRisks({ status: 'error', message: errorMessage(e) });
      }
    })();

    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
        title="Tableau de bord administrateur"
        subtitle={
          <>
            Vue agrégée sur la santé de la plateforme IOX. Dernier refresh :{' '}
            <time dateTime={lastRefresh.toISOString()}>
              {lastRefresh.toLocaleTimeString('fr-FR')}
            </time>
          </>
        }
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        }
      />

      {/* Cartes principales — chaque bloc tolère une erreur locale. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Rattachements utilisateurs"
          icon={<Link2 className="h-5 w-5 text-blue-500" />}
          href="/admin/memberships"
          state={memberships}
        >
          {(v) => (
            <>
              <Row label="Sellers" value={v.totalSellerUsers} />
              <Row label="Avec membership" value={v.sellersWithMembership} tone="green" />
              <Row
                label="Sans membership"
                value={v.sellersWithoutMembership}
                tone={v.sellersWithoutMembership > 0 ? 'orange' : 'gray'}
              />
              <Row
                label="Memberships sans sellerProfile"
                value={v.membershipsWithoutSellerProfile}
                tone={v.membershipsWithoutSellerProfile > 0 ? 'orange' : 'gray'}
              />
            </>
          )}
        </Card>

        <Card
          title="Profils vendeurs"
          icon={<Store className="h-5 w-5 text-indigo-500" />}
          href="/admin/sellers"
          state={sellers}
        >
          {(v) => (
            <>
              <Row label="Total" value={v.total} />
              <Row
                label="À valider"
                value={v.pendingReview}
                tone={v.pendingReview > 0 ? 'orange' : 'gray'}
              />
              <Row label="Approuvés" value={v.approved} tone="green" />
              <Row label="Suspendus" value={v.suspended} tone={v.suspended > 0 ? 'orange' : 'gray'} />
              <Row label="Mis en avant" value={v.featured} />
            </>
          )}
        </Card>

        <Card
          title="File de revue marketplace"
          icon={<ClipboardList className="h-5 w-5 text-purple-500" />}
          href="/admin/review-queue"
          state={reviews}
        >
          {(v) => (
            <>
              <Row label="En attente" value={v.total} tone={v.total > 0 ? 'orange' : 'gray'} />
              <Row label="Publications" value={v.byType.publication} />
              <Row label="Médias" value={v.byType.media} />
              <Row label="Documents" value={v.byType.document} />
            </>
          )}
        </Card>

        <Card
          title="Demandes de devis"
          icon={<ShoppingBag className="h-5 w-5 text-emerald-500" />}
          href="/admin/rfq"
          state={rfq}
        >
          {(v) => (
            <>
              <Row label="En cours" value={v.pending} tone={v.pending > 0 ? 'orange' : 'gray'} />
              <Row label="Devis émis" value={v.quoted} />
              <Row label="Gagnées" value={v.won} tone="green" />
              <Row label="Perdues" value={v.lost} tone="gray" />
              <Row label="Total" value={v.total} />
            </>
          )}
        </Card>
      </div>

      {/* Risques & alertes */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldAlert className="h-4 w-4 text-orange-500" /> Risques & alertes
          </h2>
          <span className="text-xs text-gray-500">
            Items PENDING &gt; 7 j · documents expirant sous 30 j
          </span>
        </div>

        {risks.status === 'loading' && (
          <div className="mt-4 h-24 animate-pulse rounded bg-gray-100" />
        )}
        {risks.status === 'error' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mr-1 inline h-4 w-4" />
            {risks.message}
          </div>
        )}
        {risks.status === 'ok' && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  File bloquée &gt; 7 jours ({risks.value.agedReviews.length})
                </p>
                <Link
                  href="/admin/review-queue?status=PENDING"
                  className="text-[11px] text-premium-accent hover:text-blue-800"
                >
                  Ouvrir la file →
                </Link>
              </div>
              {risks.value.agedReviews.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun item PENDING ancien.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {risks.value.agedReviews.slice(0, 5).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded border border-orange-200 bg-orange-50 px-2 py-1"
                    >
                      <span className="truncate">
                        <span className="font-semibold text-orange-900">{r.reviewType}</span>
                        <span className="ml-1 text-orange-700">· {r.entityType}</span>
                      </span>
                      <span className="flex-shrink-0 font-semibold tabular-nums text-orange-800">
                        {r.ageDays} j
                      </span>
                    </li>
                  ))}
                  {risks.value.agedReviews.length > 5 && (
                    <li className="italic text-gray-500">
                      + {risks.value.agedReviews.length - 5} autre(s)
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Docs expirant sous 30 j ({risks.value.expiringDocs.length})
                </p>
                <Link
                  href="/admin/diagnostics"
                  className="text-[11px] text-premium-accent hover:text-blue-800"
                >
                  Diagnostics →
                </Link>
              </div>
              {risks.value.expiringDocs.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun document n&apos;expire à court terme.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {risks.value.expiringDocs.slice(0, 5).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1"
                    >
                      <span className="truncate">
                        <span className="font-semibold text-amber-900">{d.title}</span>
                        <span className="ml-1 text-amber-700">· {d.documentType}</span>
                      </span>
                      <span className="flex-shrink-0 font-semibold tabular-nums text-amber-800">
                        {d.daysLeft} j
                      </span>
                    </li>
                  ))}
                  {risks.value.expiringDocs.length > 5 && (
                    <li className="italic text-gray-500">
                      + {risks.value.expiringDocs.length - 5} autre(s)
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Accès rapides */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-blue-500" />
          Accès rapides
        </h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink
            href="/admin/users"
            label="Utilisateurs"
            icon={<Users className="h-4 w-4" />}
          />
          <QuickLink
            href="/admin/memberships"
            label="Rattachements"
            icon={<Link2 className="h-4 w-4" />}
          />
          <QuickLink href="/admin/sellers" label="Vendeurs" icon={<Store className="h-4 w-4" />} />
          <QuickLink
            href="/admin/review-queue"
            label="File de revue"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <QuickLink
            href="/admin/rfq"
            label="Demandes de devis"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <QuickLink
            href="/admin/diagnostics"
            label="Diagnostics"
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <QuickLink
            href="/audit-logs"
            label="Journal d'audit"
            icon={<BadgeCheck className="h-4 w-4" />}
          />
        </div>
      </section>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Chargement impossible';
}

function Card<T>({
  title,
  icon,
  href,
  state,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  state: LoadState<T>;
  children: (value: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3 shadow-premium-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {icon} {title}
        </h3>
        <Link
          href={href}
          className="text-xs font-medium text-premium-accent hover:text-blue-800 inline-flex items-center gap-1"
          aria-label={`Ouvrir ${title}`}
        >
          Ouvrir <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 min-h-[120px]">
        {state.status === 'loading' && (
          <div className="space-y-2 animate-pulse" aria-label="Chargement">
            <div className="h-4 w-2/3 rounded bg-gray-100" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
            <div className="h-4 w-1/3 rounded bg-gray-100" />
          </div>
        )}
        {state.status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{state.message}</span>
          </div>
        )}
        {state.status === 'ok' && <dl className="space-y-1.5">{children(state.value)}</dl>}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value: number;
  tone?: 'gray' | 'green' | 'red' | 'orange';
}) {
  const tones: Record<string, string> = {
    gray: 'text-gray-900',
    green: 'text-green-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tones[tone]}`}>{value}</dd>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-premium-accent/40 hover:text-premium-accent hover:bg-premium-accent/5 transition-colors"
    >
      <span className="text-gray-400 group-hover:text-premium-accent">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-premium-accent transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
