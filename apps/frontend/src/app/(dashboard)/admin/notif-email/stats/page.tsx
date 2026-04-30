'use client';

// MP-NOTIF-3 phase 5 — Page stats EmailLog (admin).
//
// 3 sections : compteurs par status, top 10 templates, série temporelle
// 30 derniers jours (sent / failed / skipped). Lecture seule, restreint
// backend ADMIN/COORDINATOR.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, ArrowLeft, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { notifEmailStatsApi, EmailLogsStats } from '@/lib/notif-email';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_LABEL: Record<'SENT' | 'FAILED' | 'SKIPPED', string> = {
  SENT: 'Envoyés',
  FAILED: 'Échecs',
  SKIPPED: 'Ignorés',
};

const STATUS_BG: Record<'SENT' | 'FAILED' | 'SKIPPED', string> = {
  SENT: 'bg-emerald-50 border-emerald-200',
  FAILED: 'bg-red-50 border-red-200',
  SKIPPED: 'bg-gray-50 border-gray-200',
};

const STATUS_COLOR: Record<'SENT' | 'FAILED' | 'SKIPPED', string> = {
  SENT: 'text-emerald-700',
  FAILED: 'text-red-700',
  SKIPPED: 'text-gray-700',
};

export default function AdminNotifEmailStatsPage() {
  const [stats, setStats] = useState<EmailLogsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setErr(null);
    notifEmailStatsApi
      .getStats(token)
      .then(setStats)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = stats ? stats.byStatus.reduce((acc, s) => acc + s.count, 0) : 0;
  const maxByDay =
    stats?.byDay.reduce(
      (acc, d) => Math.max(acc, d.sent + d.failed + d.skipped),
      0,
    ) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/notif-email/logs"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour au journal
      </Link>

      <PageHeader
        icon={<BarChart3 className="h-5 w-5" aria-hidden />}
        title="Statistiques EmailLog"
        subtitle={`${total} email${total > 1 ? 's' : ''} cumulé${total > 1 ? 's' : ''}`}
      />

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : !stats ? (
        <div className="text-sm text-gray-500">Pas de stats disponibles.</div>
      ) : (
        <>
          {/* Section 1 — Compteurs par status */}
          <section data-testid="stats-by-status" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(['SENT', 'FAILED', 'SKIPPED'] as const).map((s) => {
              const count = stats.byStatus.find((b) => b.status === s)?.count ?? 0;
              const Icon =
                s === 'SENT' ? CheckCircle2 : s === 'FAILED' ? AlertTriangle : MinusCircle;
              return (
                <div
                  key={s}
                  data-testid={`status-card-${s}`}
                  className={`flex flex-col gap-1 rounded-xl border p-4 ${STATUS_BG[s]}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${STATUS_COLOR[s]}`} aria-hidden />
                    <span className={`text-xs font-medium uppercase ${STATUS_COLOR[s]}`}>
                      {STATUS_LABEL[s]}
                    </span>
                  </div>
                  <span className={`text-3xl font-bold tabular-nums ${STATUS_COLOR[s]}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </section>

          {/* Section 2 — Top 10 templates */}
          <section data-testid="stats-by-template" className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Top 10 templates</h2>
            {stats.byTemplate.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun template utilisé.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.byTemplate.map((t, idx) => {
                  const max = stats.byTemplate[0]?.count || 1;
                  const pct = (t.count / max) * 100;
                  return (
                    <li
                      key={t.templateId}
                      data-testid={`template-row-${t.templateId}`}
                      className="flex items-center gap-3"
                    >
                      <span className="w-5 text-right text-xs text-gray-400">{idx + 1}.</span>
                      <span className="w-56 font-mono text-xs text-gray-700">{t.templateId}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                      </div>
                      <span className="w-12 text-right tabular-nums text-sm text-gray-700">
                        {t.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Section 3 — 30 derniers jours */}
          <section data-testid="stats-by-day" className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">30 derniers jours</h2>
            {stats.byDay.length === 0 ? (
              <p className="text-sm text-gray-500">Pas d&apos;activité sur 30 jours.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 border-b border-gray-100 pb-2">
                  {stats.byDay.map((d) => {
                    const total = d.sent + d.failed + d.skipped;
                    const sentPct = maxByDay > 0 ? (d.sent / maxByDay) * 100 : 0;
                    const failedPct = maxByDay > 0 ? (d.failed / maxByDay) * 100 : 0;
                    const skippedPct = maxByDay > 0 ? (d.skipped / maxByDay) * 100 : 0;
                    return (
                      <div
                        key={d.day}
                        data-testid={`day-bar-${d.day}`}
                        title={`${d.day} — sent:${d.sent} failed:${d.failed} skipped:${d.skipped}`}
                        className="relative flex w-3 flex-col items-stretch"
                        style={{ height: '120px' }}
                      >
                        <div className="flex-1" />
                        {d.skipped > 0 && (
                          <div className="bg-gray-300" style={{ height: `${skippedPct}%` }} />
                        )}
                        {d.failed > 0 && (
                          <div className="bg-red-400" style={{ height: `${failedPct}%` }} />
                        )}
                        {d.sent > 0 && (
                          <div className="bg-emerald-400" style={{ height: `${sentPct}%` }} />
                        )}
                        {total === 0 && <div className="bg-gray-100" style={{ height: '2px' }} />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-400" /> Envoyés
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-red-400" /> Échecs
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-gray-300" /> Ignorés
                  </span>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
