'use client';

// ADMIN-KPI-DASHBOARD — Vue consolidée des métriques plateforme pour admin.
//
// Agrège des données depuis plusieurs endpoints existants :
// - /users (count)
// - /seller-profiles (count approved/pending)
// - /marketplace/review-queue/stats/pending
// - /marketplace/quote-requests (count by status)
// - /notif-email/logs-stats
//
// Aucun nouveau endpoint backend nécessaire.

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Store,
  Package,
  MessageSquareQuote,
  Mail,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';

interface PlatformKpi {
  usersTotal: number;
  sellersApproved: number;
  sellersPending: number;
  reviewPending: number;
  rfqTotal: number;
  rfqWon: number;
  rfqActive: number;
  emailsSent: number;
  emailsFailed: number;
}

export default function AdminKpiPage() {
  const { token } = useAuth();
  const [kpi, setKpi] = useState<PlatformKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch from existing endpoints
      const [usersRes, sellersRes, reviewRes, rfqRes, emailStatsRes] = await Promise.allSettled([
        api.get<{ meta: { total: number } }>('/users?limit=1', token),
        api.get<{ meta: { total: number } }>('/seller-profiles?limit=1', token),
        api.get<{ publications: number; media: number; documents: number }>('/marketplace/review-queue/stats/pending', token),
        api.get<{ data: Array<{ status: string }>; meta: { total: number } }>('/marketplace/quote-requests?limit=500', token),
        api.get<{ byStatus: Array<{ status: string; count: number }> }>('/notif-email/logs-stats', token),
      ]);

      const usersTotal = usersRes.status === 'fulfilled' ? (usersRes.value as { meta?: { total?: number } })?.meta?.total ?? 0 : 0;

      const sellersData = sellersRes.status === 'fulfilled' ? sellersRes.value : null;
      const sellersTotal = (sellersData as { meta?: { total?: number } } | null)?.meta?.total ?? 0;

      const reviewData = reviewRes.status === 'fulfilled' ? reviewRes.value : null;
      const reviewPending = reviewData
        ? ((reviewData as { publications?: number }).publications ?? 0) +
          ((reviewData as { media?: number }).media ?? 0) +
          ((reviewData as { documents?: number }).documents ?? 0)
        : 0;

      const rfqData = rfqRes.status === 'fulfilled' ? rfqRes.value : null;
      const rfqItems = (rfqData as { data?: Array<{ status: string }> } | null)?.data ?? [];
      const rfqTotal = (rfqData as { meta?: { total?: number } } | null)?.meta?.total ?? rfqItems.length;
      const rfqWon = rfqItems.filter((r) => r.status === 'WON').length;
      const rfqActive = rfqItems.filter((r) =>
        ['NEW', 'QUALIFIED', 'QUOTED', 'NEGOTIATING'].includes(r.status),
      ).length;

      const emailStats = emailStatsRes.status === 'fulfilled' ? emailStatsRes.value : null;
      const byStatus = (emailStats as { byStatus?: Array<{ status: string; count: number }> } | null)?.byStatus ?? [];
      const emailsSent = byStatus.find((s) => s.status === 'SENT')?.count ?? 0;
      const emailsFailed = byStatus.find((s) => s.status === 'FAILED')?.count ?? 0;

      setKpi({
        usersTotal,
        sellersApproved: sellersTotal, // endpoint returns APPROVED by default
        sellersPending: 0, // would need separate call with status filter
        reviewPending,
        rfqTotal,
        rfqWon,
        rfqActive,
        emailsSent,
        emailsFailed,
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="KPIs Plateforme"
        subtitle="Vue consolidée des indicateurs clés"
        icon={<TrendingUp className="h-5 w-5" />}
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={Users}
          label="Utilisateurs"
          value={kpi?.usersTotal ?? 0}
          loading={loading}
        />
        <KpiCard
          icon={Store}
          label="Vendeurs actifs"
          value={kpi?.sellersApproved ?? 0}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          icon={Clock}
          label="En attente de revue"
          value={kpi?.reviewPending ?? 0}
          loading={loading}
          accent="amber"
        />
        <KpiCard
          icon={MessageSquareQuote}
          label="Total RFQ"
          value={kpi?.rfqTotal ?? 0}
          loading={loading}
        />
        <KpiCard
          icon={CheckCircle2}
          label="RFQ gagnées"
          value={kpi?.rfqWon ?? 0}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          icon={Package}
          label="RFQ actives"
          value={kpi?.rfqActive ?? 0}
          loading={loading}
          accent="cyan"
        />
        <KpiCard
          icon={Mail}
          label="Emails envoyés"
          value={kpi?.emailsSent ?? 0}
          loading={loading}
        />
        <KpiCard
          icon={AlertCircle}
          label="Emails échoués"
          value={kpi?.emailsFailed ?? 0}
          loading={loading}
          accent="red"
        />
      </div>

      {/* Conversion Insight */}
      {kpi && kpi.rfqTotal > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Taux de conversion global</h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00D4FF]">
                {Math.round((kpi.rfqWon / kpi.rfqTotal) * 100)}%
              </p>
              <p className="text-xs text-white/50">RFQ → WON</p>
            </div>
            <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00D4FF] to-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.round((kpi.rfqWon / kpi.rfqTotal) * 100)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{kpi.rfqWon}/{kpi.rfqTotal}</p>
              <p className="text-xs text-white/50">gagnées/total</p>
            </div>
          </div>
        </section>
      )}

      {/* Email Health */}
      {kpi && (kpi.emailsSent + kpi.emailsFailed) > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Santé emails</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Taux de succès</span>
                <span>
                  {Math.round((kpi.emailsSent / (kpi.emailsSent + kpi.emailsFailed)) * 100)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/70 rounded-full"
                  style={{
                    width: `${Math.round((kpi.emailsSent / (kpi.emailsSent + kpi.emailsFailed)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      )}
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
  icon: typeof Users;
  label: string;
  value: number;
  loading: boolean;
  accent?: 'emerald' | 'cyan' | 'amber' | 'red';
}) {
  const colors = {
    emerald: 'text-emerald-400',
    cyan: 'text-[#00D4FF]',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };
  const valueColor = accent ? colors[accent] : 'text-white';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-white/50" />
        <span className="text-xs text-white/60 uppercase tracking-wide font-medium">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-white/5" />
      ) : (
        <p className={`text-3xl font-bold ${valueColor}`}>{value.toLocaleString('fr-FR')}</p>
      )}
    </div>
  );
}
