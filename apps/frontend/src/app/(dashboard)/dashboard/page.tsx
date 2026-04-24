'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Package,
  Truck,
  ShieldCheck,
  Tag,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  GitMerge,
  type LucideIcon,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { MetricCard } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Stats {
  beneficiaries: { total: number; active: number };
  inboundBatches: {
    total: number;
    received: number;
    inControl: number;
    accepted: number;
    rejected: number;
  };
  productBatches: {
    total: number;
    created: number;
    readyForValidation: number;
    available: number;
    reserved: number;
    shipped: number;
    blocked: number;
    destroyed: number;
    availableOrReserved: number;
  };
  marketDecisions: {
    total: number;
    compliant: number;
    withReservations: number;
    blocked: number;
    complianceRate: number;
  };
  labelValidations: { total: number; valid: number; invalid: number; passRate: number };
  documents: { totalActive: number };
  incidents?: { open: number; critical: number };
  products: { total: number; compliant: number; blocked: number; draft: number };
  distributions?: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    completedLast30Days: number;
  };
}

interface RecentBatch {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  product?: { name: string };
}

interface RecentDecision {
  id: string;
  decision: string;
  decidedAt?: string;
  productBatch?: { id: string; code: string };
  validatedBy?: { firstName: string; lastName: string };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmt(d: string | undefined | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

const DECISION_CLS: Record<string, string> = {
  COMPLIANT: 'bg-green-100 text-green-700',
  COMPLIANT_WITH_RESERVATIONS: 'bg-yellow-100 text-yellow-700',
  NON_COMPLIANT: 'bg-red-100 text-red-700',
};
const DECISION_LABEL: Record<string, string> = {
  COMPLIANT: 'Conforme',
  COMPLIANT_WITH_RESERVATIONS: 'Avec réserves',
  NON_COMPLIANT: 'Non conforme',
};

const STATUS_CLS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-red-100 text-red-700',
  READY_FOR_VALIDATION: 'bg-yellow-100 text-yellow-700',
  CREATED: 'bg-gray-100 text-gray-600',
  RESERVED: 'bg-purple-100 text-purple-700',
  DESTROYED: 'bg-red-50 text-red-400',
};

/* ------------------------------------------------------------------ */
/*  Mini bar chart (pure Tailwind, no lib)                             */
/* ------------------------------------------------------------------ */

function BarChart({
  items,
  total,
}: {
  items: { label: string; value: number; color: string }[];
  total: number;
}) {
  if (total === 0) {
    return <p className="text-xs text-gray-400 py-4 text-center">Aucune donnée</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color} transition-all duration-500`}
              style={{ width: `${total > 0 ? Math.round((item.value / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card — DS-2 : wrapper autour de <MetricCard /> pour conserver  */
/*  la signature historique (color = classe Tailwind bg-*).             */
/* ------------------------------------------------------------------ */

// Classe Tailwind (bg-blue-500, bg-teal-500, …) → hex pour MetricCard.
// Tokens Tailwind 3.4 officiels, alignés sur le DS premium.
const BG_CLASS_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3B82F6',
  'bg-teal-500': '#14B8A6',
  'bg-orange-500': '#F2994A', // aligné --iox-premium-warning
  'bg-indigo-500': '#6366F1',
  'bg-green-500': '#27AE60', // aligné --iox-premium-success
  'bg-purple-500': '#8B5CF6',
  'bg-cyan-500': '#06B6D4',
  'bg-red-500': '#EB5757',
  'bg-yellow-500': '#F59E0B',
};

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  href,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  href?: string;
  delay?: number;
}) {
  const accent = BG_CLASS_TO_HEX[color] ?? '#2D9CDB';
  const card = (
    <MetricCard
      icon={icon}
      label={label}
      value={value}
      color={accent}
      sub={sub}
      delay={delay}
      className={href ? 'cursor-pointer transition-shadow hover:shadow-premium-md' : undefined}
    />
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

/* ------------------------------------------------------------------ */
/*  Rate gauge (simple %)                                              */
/* ------------------------------------------------------------------ */

function RateGauge({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{rate}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<{
    recentBatches: RecentBatch[];
    recentDecisions: RecentDecision[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const h = { Authorization: `Bearer ${token}` };

      const [sRes, rRes] = await Promise.all([
        fetch('/api/v1/dashboard/stats', { headers: h }),
        fetch('/api/v1/dashboard/recent-activity', { headers: h }),
      ]);

      if (!sRes.ok) throw new Error('Impossible de charger les statistiques');
      if (!rRes.ok) throw new Error("Impossible de charger l'activité récente");

      const [sJson, rJson] = await Promise.all([sRes.json(), rRes.json()]);
      setStats(sJson.data ?? sJson);
      setRecent(rJson.data ?? rJson);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-1">Chargement…</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchAll} className="mt-3 text-xs text-red-600 underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Mis à jour{' '}
              {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Row 1 — entités principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          delay={0.0}
          icon={Users}
          label="Bénéficiaires"
          color="bg-blue-500"
          value={stats.beneficiaries.total}
          sub={`${stats.beneficiaries.active} actifs`}
          href="/beneficiaries"
        />
        <KpiCard
          delay={0.05}
          icon={Package}
          label="Produits"
          color="bg-teal-500"
          value={stats.products.total}
          sub={`${stats.products.compliant} conformes`}
          href="/products"
        />
        <KpiCard
          delay={0.1}
          icon={Truck}
          label="Lots entrants"
          color="bg-orange-500"
          value={stats.inboundBatches.total}
          sub={`${stats.inboundBatches.inControl} en contrôle`}
          href="/inbound-batches"
        />
        <KpiCard
          delay={0.15}
          icon={Package}
          label="Lots finis"
          color="bg-indigo-500"
          value={stats.productBatches.total}
          sub={`${stats.productBatches.availableOrReserved} disponibles`}
          href="/product-batches"
        />
      </div>

      {/* KPI Row 2 — qualité */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          delay={0.2}
          icon={ShieldCheck}
          label="Décisions marché"
          color="bg-green-500"
          value={stats.marketDecisions.total}
          sub={`${stats.marketDecisions.complianceRate}% de conformité`}
          href="/product-batches"
        />
        <KpiCard
          delay={0.25}
          icon={Tag}
          label="Validations étiquetage"
          color="bg-purple-500"
          value={stats.labelValidations.total}
          sub={`${stats.labelValidations.passRate}% valides`}
        />
        <KpiCard
          delay={0.3}
          icon={FileText}
          label="Documents actifs"
          color="bg-cyan-500"
          value={stats.documents.totalActive}
        />
        <KpiCard
          delay={0.35}
          icon={AlertTriangle}
          label="Incidents ouverts"
          color="bg-red-500"
          value={stats.incidents?.open ?? 0}
          sub={
            stats.incidents?.critical
              ? `dont ${stats.incidents.critical} critique(s)`
              : 'aucun critique'
          }
          href="/incidents"
        />
      </div>

      {/* KPI Row 3 — distributions */}
      {stats.distributions && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={GitMerge}
            label="Distributions"
            color="bg-yellow-500"
            value={stats.distributions.total}
            sub={`${stats.distributions.completedLast30Days} complétée(s) (30j)`}
            href="/distributions"
          />
          <div className="rounded-xl border border-gray-200 bg-white p-5 col-span-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pipeline distributions
            </p>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                {
                  label: 'Planifiées',
                  value: stats.distributions.planned,
                  cls: 'text-blue-700 bg-blue-50',
                  ring: 'ring-blue-200',
                },
                {
                  label: 'En cours',
                  value: stats.distributions.inProgress,
                  cls: 'text-yellow-700 bg-yellow-50',
                  ring: 'ring-yellow-200',
                },
                {
                  label: 'Complétées',
                  value: stats.distributions.completed,
                  cls: 'text-green-700 bg-green-50',
                  ring: 'ring-green-200',
                },
                {
                  label: 'Annulées',
                  value: stats.distributions.cancelled,
                  cls: 'text-red-600 bg-red-50',
                  ring: 'ring-red-200',
                },
              ].map(({ label, value, cls, ring }) => (
                <div key={label} className={`rounded-lg ${cls} ring-1 ${ring} px-3 py-3`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs mt-0.5 opacity-80">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Lots finis par statut */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Lots finis par statut</h3>
          <BarChart
            total={stats.productBatches.total}
            items={[
              { label: 'Disponible', value: stats.productBatches.available, color: 'bg-green-500' },
              { label: 'Réservé', value: stats.productBatches.reserved, color: 'bg-purple-500' },
              { label: 'Expédié', value: stats.productBatches.shipped, color: 'bg-blue-500' },
              {
                label: 'Prêt validation',
                value: stats.productBatches.readyForValidation,
                color: 'bg-yellow-400',
              },
              { label: 'Créé', value: stats.productBatches.created, color: 'bg-gray-400' },
              { label: 'Bloqué', value: stats.productBatches.blocked, color: 'bg-red-500' },
              { label: 'Détruit', value: stats.productBatches.destroyed, color: 'bg-red-300' },
            ]}
          />
        </div>

        {/* Lots entrants par statut */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Lots entrants par statut</h3>
          <BarChart
            total={stats.inboundBatches.total}
            items={[
              { label: 'Reçu', value: stats.inboundBatches.received, color: 'bg-blue-400' },
              {
                label: 'En contrôle',
                value: stats.inboundBatches.inControl,
                color: 'bg-yellow-400',
              },
              { label: 'Accepté', value: stats.inboundBatches.accepted, color: 'bg-green-500' },
              { label: 'Rejeté', value: stats.inboundBatches.rejected, color: 'bg-red-500' },
            ]}
          />
        </div>

        {/* Taux de conformité */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Taux de qualité</h3>
          <div className="space-y-4">
            <RateGauge
              label="Conformité mise en marché"
              rate={stats.marketDecisions.complianceRate}
              color="bg-green-500"
            />
            <RateGauge
              label="Validation étiquetage"
              rate={stats.labelValidations.passRate}
              color="bg-purple-500"
            />
            <RateGauge
              label="Bénéficiaires actifs"
              rate={
                stats.beneficiaries.total > 0
                  ? Math.round((stats.beneficiaries.active / stats.beneficiaries.total) * 100)
                  : 0
              }
              color="bg-blue-500"
            />

            {/* Market decisions breakdown */}
            {stats.marketDecisions.total > 0 && (
              <div className="pt-2 mt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-700">
                    {stats.marketDecisions.compliant}
                  </p>
                  <p className="text-xs text-gray-400">Conformes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">
                    {stats.marketDecisions.withReservations}
                  </p>
                  <p className="text-xs text-gray-400">Avec rés.</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{stats.marketDecisions.blocked}</p>
                  <p className="text-xs text-gray-400">Bloqués</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent product batches */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Derniers lots finis</h3>
              <Link href="/product-batches" className="text-xs text-blue-600 hover:underline">
                Voir tout
              </Link>
            </div>
            {recent.recentBatches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun lot</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.recentBatches.slice(0, 6).map((b) => (
                  <Link
                    key={b.id}
                    href={`/product-batches/${b.id}`}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-mono">{b.code}</p>
                      <p className="text-xs text-gray-400 truncate">{b.product?.name ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(b.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent market decisions */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Dernières décisions marché</h3>
              <Link href="/product-batches" className="text-xs text-blue-600 hover:underline">
                Voir tout
              </Link>
            </div>
            {recent.recentDecisions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune décision</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.recentDecisions.slice(0, 6).map((d) => (
                  <Link
                    key={d.id}
                    href={d.productBatch ? `/product-batches/${d.productBatch.id}` : '#'}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {d.productBatch?.code ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.validatedBy
                          ? `${d.validatedBy.firstName} ${d.validatedBy.lastName}`
                          : '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${DECISION_CLS[d.decision] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {DECISION_LABEL[d.decision] ?? d.decision}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(d.decidedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Accès rapides</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/distributions/new', label: '+ Nouvelle distribution' },
            { href: '/product-batches/new', label: '+ Nouveau lot fini' },
            { href: '/inbound-batches/new', label: '+ Réceptionner un lot' },
            { href: '/beneficiaries/new', label: '+ Nouveau bénéficiaire' },
            { href: '/label-validations', label: 'Validations étiquetage' },
            { href: '/incidents', label: 'Incidents' },
            { href: '/audit-logs', label: "Journal d'audit" },
            { href: '/products', label: 'Fiches produit' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Compliance alert */}
      {stats.productBatches.blocked > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {stats.productBatches.blocked} lot{stats.productBatches.blocked > 1 ? 's' : ''} bloqué
              {stats.productBatches.blocked > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Des lots finis présentent une décision de non-conformité et nécessitent une action
              corrective.
            </p>
            <Link
              href="/product-batches"
              className="text-xs text-red-700 underline mt-1 inline-block"
            >
              Voir les lots bloqués →
            </Link>
          </div>
        </div>
      )}

      {/* Quick compliance check */}
      {stats.productBatches.blocked === 0 &&
        stats.marketDecisions.total > 0 &&
        stats.marketDecisions.complianceRate === 100 && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">
              Tous les lots actifs sont conformes. Taux de conformité : 100%.
            </p>
          </div>
        )}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Les statistiques sont calculées en temps réel depuis la base de données.</span>
      </div>
    </div>
  );
}
