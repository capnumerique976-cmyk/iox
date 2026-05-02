'use client';

// SELLER-ANALYTICS — Page analytique vendeur.
//
// Affiche des métriques agrégées calculées côté client à partir des RFQ
// et offres existantes. Pas de nouveau endpoint backend nécessaire.

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Package,
  MessageSquareQuote,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { QuoteRequestStatus } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';

interface MonthlyMetric {
  month: string; // YYYY-MM
  label: string; // "Jan 2026"
  won: number;
  total: number;
}

interface ProductMetric {
  productName: string;
  slug: string;
  rfqCount: number;
  wonCount: number;
}

function computeMonthlyMetrics(items: QuoteRequestSummary[]): MonthlyMetric[] {
  const map = new Map<string, { won: number; total: number }>();
  for (const it of items) {
    const d = new Date(it.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = map.get(key) ?? { won: 0, total: 0 };
    entry.total += 1;
    if (it.status === QuoteRequestStatus.WON) entry.won += 1;
    map.set(key, entry);
  }

  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  return sorted.slice(-6).map(([key, val]) => {
    const [y, m] = key.split('-');
    return {
      month: key,
      label: `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`,
      ...val,
    };
  });
}

function computeTopProducts(items: QuoteRequestSummary[]): ProductMetric[] {
  const map = new Map<string, ProductMetric>();
  for (const it of items) {
    const prod = it.marketplaceOffer?.marketplaceProduct;
    if (!prod) continue;
    const entry = map.get(prod.id) ?? {
      productName: prod.commercialName,
      slug: prod.slug,
      rfqCount: 0,
      wonCount: 0,
    };
    entry.rfqCount += 1;
    if (it.status === QuoteRequestStatus.WON) entry.wonCount += 1;
    map.set(prod.id, entry);
  }
  return [...map.values()].sort((a, b) => b.rfqCount - a.rfqCount).slice(0, 5);
}

export default function SellerAnalyticsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    quoteRequestsApi
      .list(token, { limit: '500' })
      .then((res) => setItems(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const totalRfq = items.length;
  const wonCount = items.filter((it) => it.status === QuoteRequestStatus.WON).length;
  const conversionRate = totalRfq > 0 ? Math.round((wonCount / totalRfq) * 100) : 0;
  const activeCount = items.filter((it) =>
    [QuoteRequestStatus.NEW, QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.QUOTED, QuoteRequestStatus.NEGOTIATING].includes(it.status),
  ).length;

  const monthly = computeMonthlyMetrics(items);
  const topProducts = computeTopProducts(items);
  const maxMonthly = Math.max(...monthly.map((m) => m.total), 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytique"
        subtitle="Performance de vos ventes et demandes de devis"
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={MessageSquareQuote}
          label="Total RFQ"
          value={totalRfq}
          loading={loading}
        />
        <KpiCard
          icon={Trophy}
          label="Gagnées (WON)"
          value={wonCount}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          icon={Target}
          label="Taux conversion"
          value={`${conversionRate}%`}
          loading={loading}
          accent="cyan"
        />
        <KpiCard
          icon={TrendingUp}
          label="En cours"
          value={activeCount}
          loading={loading}
          accent="amber"
        />
      </div>

      {/* Monthly Chart */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Demandes par mois (6 derniers mois)
        </h2>
        {loading ? (
          <div className="h-40 animate-pulse rounded-lg bg-white/5" />
        ) : monthly.length === 0 ? (
          <p className="text-sm text-white/50">Aucune donnée disponible.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                  {/* Total bar */}
                  <div
                    className="w-8 rounded-t bg-[#7B61FF]/40 transition-all"
                    style={{ height: `${(m.total / maxMonthly) * 100}%`, minHeight: m.total > 0 ? '4px' : '0' }}
                  />
                  {/* Won overlay */}
                  {m.won > 0 && (
                    <div
                      className="absolute bottom-0 w-8 rounded-t bg-emerald-500/70"
                      style={{ height: `${(m.won / maxMonthly) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-white/50">{m.label}</span>
                <span className="text-xs font-medium text-white/80">{m.total}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#7B61FF]/40" /> Total
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/70" /> Gagnées
          </span>
        </div>
      </section>

      {/* Top Products */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Top produits demandés
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <p className="text-sm text-white/50">Aucun produit demandé pour l&#39;instant.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, idx) => (
              <div
                key={p.slug}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7B61FF]/20 text-xs font-bold text-[#7B61FF]">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{p.productName}</p>
                    <p className="text-xs text-white/50">
                      {p.rfqCount} demande{p.rfqCount > 1 ? 's' : ''} · {p.wonCount} gagnée{p.wonCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/marketplace/products/${p.slug}`}
                  className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1"
                >
                  Voir <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Conversion Funnel */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Entonnoir de conversion</h2>
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <FunnelChart items={items} />
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
  loading: boolean;
  accent?: 'emerald' | 'cyan' | 'amber';
}) {
  const accentColors = {
    emerald: 'text-emerald-400',
    cyan: 'text-[#00D4FF]',
    amber: 'text-amber-400',
  };
  const valueColor = accent ? accentColors[accent] : 'text-white';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-white/50" />
        <span className="text-xs text-white/60 uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-white/5" />
      ) : (
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      )}
    </div>
  );
}

function FunnelChart({ items }: { items: QuoteRequestSummary[] }) {
  const stages = [
    { label: 'Reçues', statuses: Object.values(QuoteRequestStatus), color: 'bg-white/20' },
    { label: 'Qualifiées', statuses: [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.QUOTED, QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.WON], color: 'bg-[#7B61FF]/40' },
    { label: 'Devisées', statuses: [QuoteRequestStatus.QUOTED, QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.WON], color: 'bg-[#00D4FF]/40' },
    { label: 'Gagnées', statuses: [QuoteRequestStatus.WON], color: 'bg-emerald-500/60' },
  ];

  const counts = stages.map((s) => ({
    ...s,
    count: items.filter((it) => s.statuses.includes(it.status)).length,
  }));
  const maxCount = Math.max(counts[0]?.count ?? 1, 1);

  return (
    <div className="space-y-3">
      {counts.map((stage) => (
        <div key={stage.label} className="flex items-center gap-3">
          <span className="w-24 text-xs text-white/60 text-right">{stage.label}</span>
          <div className="flex-1 h-7 rounded-md bg-white/5 overflow-hidden">
            <div
              className={`h-full ${stage.color} rounded-md transition-all flex items-center px-2`}
              style={{ width: `${Math.max((stage.count / maxCount) * 100, 2)}%` }}
            >
              <span className="text-xs font-medium text-white">{stage.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
