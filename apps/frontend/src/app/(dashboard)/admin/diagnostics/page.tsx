'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  MembershipRow,
  MembershipsDiagnostic,
  OrphanSeller,
  getMembershipsDiagnostic,
  listOrphanMemberships,
  listOrphanSellers,
} from '@/lib/memberships';

/**
 * Diagnostics admin — détection de dérives structurelles.
 *
 * Regroupe les incohérences que l'admin doit pouvoir lever rapidement :
 * - Sellers sans rattachement (ownership vide).
 * - Rattachements sans sellerProfile (ownership cassée côté publication).
 * - Synthèse chiffrée issue de `/admin/memberships/diagnostic`.
 *
 * N'exécute aucune mutation ici : la page oriente l'admin vers les
 * écrans de résolution (Memberships pour rattacher, Sellers pour traiter
 * la validation). Objectif : un seul écran « radar ».
 */

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; value: T }
  | { status: 'error'; message: string };

/* ─── Health & Ops snapshot ────────────────────────────────────────── */

interface HealthCheckResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: string; [k: string]: unknown }>;
  error?: Record<string, { status: string; [k: string]: unknown }>;
  details?: Record<string, { status: string; [k: string]: unknown }>;
}

interface OpsSnapshot {
  generatedAt: string;
  sellers: { total: number; pendingReview: number; approved: number; suspended: number };
  publications: {
    products: { published: number; inReview: number };
    offers: { published: number; inReview: number };
  };
  review: { pending: number };
  documents: { pending: number; rejected: number };
  rfq: { newCount: number; negotiating: number };
}

function getHealthBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) return raw.replace(/\/$/, '');
  return '/api/v1';
}

async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${getHealthBase()}/health`, { cache: 'no-store' });
  const json = (await res.json()) as HealthCheckResponse;
  // Terminus renvoie 200 (ok) ou 503 (error) — on accepte les deux
  // et on s'appuie sur le champ `status` du body.
  return json;
}

async function fetchOps(token: string): Promise<OpsSnapshot> {
  const res = await fetch(`${getHealthBase()}/health/ops`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as OpsSnapshot;
}

export default function AdminDiagnosticsPage() {
  const [diag, setDiag] = useState<LoadState<MembershipsDiagnostic>>({ status: 'loading' });
  const [orphanSellers, setOrphanSellers] = useState<LoadState<OrphanSeller[]>>({
    status: 'loading',
  });
  const [orphanMemberships, setOrphanMemberships] = useState<LoadState<MembershipRow[]>>({
    status: 'loading',
  });
  const [health, setHealth] = useState<LoadState<HealthCheckResponse>>({ status: 'loading' });
  const [ops, setOps] = useState<LoadState<OpsSnapshot>>({ status: 'loading' });
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken() ?? '';
    setDiag({ status: 'loading' });
    setOrphanSellers({ status: 'loading' });
    setOrphanMemberships({ status: 'loading' });
    setHealth({ status: 'loading' });
    setOps({ status: 'loading' });

    fetchHealth()
      .then((h) => setHealth({ status: 'ok', value: h }))
      .catch((e) => setHealth({ status: 'error', message: errorMessage(e) }));

    fetchOps(token)
      .then((o) => setOps({ status: 'ok', value: o }))
      .catch((e) => setOps({ status: 'error', message: errorMessage(e) }));

    getMembershipsDiagnostic(token)
      .then((d) => setDiag({ status: 'ok', value: d }))
      .catch((e) => setDiag({ status: 'error', message: errorMessage(e) }));

    listOrphanSellers(token)
      .then((r) => setOrphanSellers({ status: 'ok', value: r.data }))
      .catch((e) => setOrphanSellers({ status: 'error', message: errorMessage(e) }));

    listOrphanMemberships(token)
      .then((r) => setOrphanMemberships({ status: 'ok', value: r.data }))
      .catch((e) => setOrphanMemberships({ status: 'error', message: errorMessage(e) }));

    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-orange-500" />
            Diagnostics structure marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Radar des dérives détectables automatiquement — dernier refresh :{' '}
            <time dateTime={lastRefresh.toISOString()}>
              {lastRefresh.toLocaleTimeString('fr-FR')}
            </time>
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraîchir
        </button>
      </header>

      {/* Health (readiness) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" /> Santé service (readiness)
        </h2>
        {health.status === 'loading' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white h-20 animate-pulse"
              />
            ))}
          </div>
        )}
        {health.status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Health endpoint injoignable : {health.message}
          </div>
        )}
        {health.status === 'ok' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HealthIndicator
              icon={<Database className="h-4 w-4" />}
              label="Base de données"
              status={
                (health.value.info?.database?.status ??
                  health.value.error?.database?.status ??
                  'unknown') as string
              }
            />
            <HealthIndicator
              icon={<HardDrive className="h-4 w-4" />}
              label="Stockage (MinIO)"
              status={
                (health.value.info?.storage?.status ??
                  health.value.error?.storage?.status ??
                  'unknown') as string
              }
            />
            <HealthIndicator
              icon={<Activity className="h-4 w-4" />}
              label="Global"
              status={health.value.status === 'ok' ? 'up' : 'down'}
            />
          </div>
        )}
      </section>

      {/* Ops snapshot */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Snapshot exploitation</h2>
        {ops.status === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white h-20 animate-pulse"
              />
            ))}
          </div>
        )}
        {ops.status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Métriques ops indisponibles : {ops.message}
          </div>
        )}
        {ops.status === 'ok' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Sellers total" value={ops.value.sellers.total} />
            <Stat
              label="Sellers en attente"
              value={ops.value.sellers.pendingReview}
              tone={ops.value.sellers.pendingReview > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="Sellers suspendus"
              value={ops.value.sellers.suspended}
              tone={ops.value.sellers.suspended > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="Produits publiés"
              value={ops.value.publications.products.published}
              tone="green"
            />
            <Stat
              label="Produits en revue"
              value={ops.value.publications.products.inReview}
              tone={ops.value.publications.products.inReview > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="Offres publiées"
              value={ops.value.publications.offers.published}
              tone="green"
            />
            <Stat
              label="Revue en attente"
              value={ops.value.review.pending}
              tone={ops.value.review.pending > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="Docs rejetés"
              value={ops.value.documents.rejected}
              tone={ops.value.documents.rejected > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="Docs en attente"
              value={ops.value.documents.pending}
              tone={ops.value.documents.pending > 0 ? 'orange' : 'gray'}
            />
            <Stat
              label="RFQ nouvelles"
              value={ops.value.rfq.newCount}
              tone={ops.value.rfq.newCount > 0 ? 'orange' : 'gray'}
            />
            <Stat label="RFQ en négo." value={ops.value.rfq.negotiating} />
          </div>
        )}
      </section>

      {/* Synthèse chiffrée */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Synthèse rattachements</h2>
        {diag.status === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 h-20 animate-pulse"
              />
            ))}
          </div>
        )}
        {diag.status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {diag.message}
          </div>
        )}
        {diag.status === 'ok' && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat label="Sellers (users)" value={diag.value.totalSellerUsers} />
            <Stat label="Avec membership" value={diag.value.sellersWithMembership} tone="green" />
            <Stat
              label="Sans membership"
              value={diag.value.sellersWithoutMembership}
              tone={diag.value.sellersWithoutMembership > 0 ? 'orange' : 'gray'}
            />
            <Stat label="Memberships total" value={diag.value.totalMemberships} />
            <Stat
              label="Sans sellerProfile"
              value={diag.value.membershipsWithoutSellerProfile}
              tone={diag.value.membershipsWithoutSellerProfile > 0 ? 'orange' : 'gray'}
            />
          </div>
        )}
      </section>

      {/* Sellers orphelins */}
      <Section
        title={`Sellers sans rattachement (${
          orphanSellers.status === 'ok' ? orphanSellers.value.length : '…'
        })`}
        description={
          <>
            Ces utilisateurs ont le rôle{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">MARKETPLACE_SELLER</code> mais aucune
            membership : ils ne peuvent rien publier. Résolution : créer un rattachement vers leur
            entreprise.
          </>
        }
        actionHref="/admin/memberships"
        actionLabel="Ouvrir les rattachements"
      >
        {orphanSellers.status === 'loading' && <p className="text-sm text-gray-400">Chargement…</p>}
        {orphanSellers.status === 'error' && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {orphanSellers.message}
          </p>
        )}
        {orphanSellers.status === 'ok' && orphanSellers.value.length === 0 && (
          <p className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aucun seller orphelin.
          </p>
        )}
        {orphanSellers.status === 'ok' && orphanSellers.value.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {orphanSellers.value.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {u.email} · {u.isActive ? 'actif' : 'désactivé'}
                  </p>
                </div>
                <Link
                  href={`/admin/memberships?prefillUserId=${u.id}`}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-600 text-white text-xs px-3 py-1.5 hover:bg-orange-700"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Rattacher
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Memberships sans sellerProfile */}
      <Section
        title={`Rattachements sans profil vendeur (${
          orphanMemberships.status === 'ok' ? orphanMemberships.value.length : '…'
        })`}
        description={
          <>
            Ces memberships pointent vers une entreprise qui n&apos;a pas encore de{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">sellerProfile</code>. Le user est
            rattaché administrativement mais ne peut rien publier : l&apos;entreprise doit initier
            son profil vendeur.
          </>
        }
        actionHref="/admin/sellers"
        actionLabel="Ouvrir les profils vendeurs"
      >
        {orphanMemberships.status === 'loading' && (
          <p className="text-sm text-gray-400">Chargement…</p>
        )}
        {orphanMemberships.status === 'error' && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {orphanMemberships.message}
          </p>
        )}
        {orphanMemberships.status === 'ok' && orphanMemberships.value.length === 0 && (
          <p className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Toutes les memberships ont un profil vendeur
            associé.
          </p>
        )}
        {orphanMemberships.status === 'ok' && orphanMemberships.value.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {orphanMemberships.value.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {m.user.firstName} {m.user.lastName}{' '}
                    <span className="text-gray-400 font-normal">· {m.user.email}</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {m.company.code} · {m.company.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────── */

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Chargement impossible';
}

function HealthIndicator({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
}) {
  const isUp = status === 'up' || status === 'ok';
  const classes = isUp
    ? 'bg-green-50 border-green-200 text-green-700'
    : status === 'unknown'
      ? 'bg-gray-50 border-gray-200 text-gray-500'
      : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${classes}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs font-mono uppercase tracking-wide">{status}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value: number;
  tone?: 'gray' | 'green' | 'red' | 'orange';
}) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="text-xs font-medium text-premium-accent hover:text-blue-800 inline-flex items-center gap-1"
          >
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
      {children}
    </section>
  );
}
