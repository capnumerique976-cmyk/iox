'use client';

// M57 — Page conformité admin marketplace.
// Vue d'ensemble de la conformité des vendeurs IOX.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  XCircle,
  FileSearch,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface AdminComplianceSummary {
  sellersTotal: number;
  sellersApproved: number;
  sellersPendingReview: number;
  sellersRejected: number;
  sellersSuspended: number;
  documentsPending: number;
  documentsRejected: number;
  documentsExpired: number;
  documentsExpiringSoon: number;
  certificationsPending: number;
  certificationsRejected: number;
  certificationsExpired: number;
  certificationsExpiringSoon: number;
  reviewQueuePending: number;
}

interface SellerComplianceRow {
  sellerProfileId: string;
  publicDisplayName: string;
  sellerProfileStatus: string;
  complianceStatus: string;
  documentsTotal: number;
  documentsVerified: number;
  documentsPending: number;
  documentsRejected: number;
  certificationsTotal: number;
  certificationsVerified: number;
  certificationsPending: number;
  certificationsRejected: number;
}

/* ─── Mapping statuts conformité → badge ─────────────────────────────── */

const COMPLIANCE_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETE: { label: 'Conforme', cls: 'bg-green-100 text-green-800' },
  ACTION_REQUIRED: { label: 'Action requise', cls: 'bg-red-100 text-red-800' },
  PENDING_REVIEW: { label: 'En vérification', cls: 'bg-blue-100 text-blue-800' },
  BLOCKED: { label: 'Bloqué', cls: 'bg-red-200 text-red-900' },
  INCOMPLETE: { label: 'Incomplet', cls: 'bg-orange-100 text-orange-800' },
};

function ComplianceBadge({ status }: { status: string }) {
  const cfg = COMPLIANCE_BADGE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ─── Carte KPI ─────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  testId,
}: {
  icon: typeof CheckCircle;
  label: string;
  value: number;
  color: 'green' | 'blue' | 'yellow' | 'red';
  testId?: string;
}) {
  const colorMap = {
    green: { icon: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', num: 'text-green-700' },
    blue: { icon: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', num: 'text-blue-700' },
    yellow: { icon: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', num: 'text-yellow-700' },
    red: { icon: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', num: 'text-red-700' },
  };
  const c = colorMap[color];

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-center gap-4`}
      data-testid={testId}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm`}>
        <Icon className={`h-5 w-5 ${c.icon}`} aria-hidden />
      </div>
      <div>
        <p className={`text-2xl font-bold ${c.num}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────── */

export default function AdminCompliancePage() {
  const [summary, setSummary] = useState<AdminComplianceSummary | null>(null);
  const [sellers, setSellers] = useState<SellerComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/v1/compliance/admin/summary', { headers }).then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json() as Promise<AdminComplianceSummary>;
      }),
      fetch('/api/v1/compliance/admin/sellers', { headers }).then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json() as Promise<SellerComplianceRow[]>;
      }),
    ])
      .then(([s, rows]) => {
        setSummary(s);
        setSellers(rows);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-compliance-page">
      <PageHeader
        title="Conformité Marketplace"
        subtitle="Vue d'ensemble de la conformité des vendeurs IOX."
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* ── Chargement ── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* ── Erreur ── */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger les données : {error}
        </div>
      )}

      {/* ── Contenu ── */}
      {!loading && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={CheckCircle}
              label="Vendeurs conformes"
              value={summary.sellersApproved}
              color="green"
              testId="admin-compliance-kpi-approved"
            />
            <KpiCard
              icon={Clock}
              label="En attente de validation"
              value={summary.sellersPendingReview}
              color="blue"
              testId="admin-compliance-kpi-pending"
            />
            <KpiCard
              icon={FileSearch}
              label="Documents à vérifier"
              value={summary.documentsPending + summary.certificationsPending}
              color="yellow"
            />
            <KpiCard
              icon={XCircle}
              label="Éléments refusés"
              value={summary.documentsRejected + summary.certificationsRejected}
              color="red"
            />
          </div>

          {/* Alerte expirations */}
          {(summary.documentsExpiringSoon + summary.certificationsExpiringSoon) > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>{summary.documentsExpiringSoon + summary.certificationsExpiringSoon}</strong>{' '}
                document(s) / certification(s) expirent dans moins de 30 jours.
              </span>
            </div>
          )}

          {/* Lien file de modération */}
          <div>
            <Link
              href="/admin/review-queue"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Voir la file de modération ({summary.reviewQueuePending} en attente)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tableau vendors */}
          {sellers.length === 0 ? (
            <p data-testid="admin-compliance-empty" className="py-8 text-center text-sm text-gray-400">
              Aucun vendeur enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
              <table
                data-testid="admin-compliance-sellers-table"
                className="min-w-full text-sm"
              >
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Vendeur</th>
                    <th className="px-4 py-3">Statut profil</th>
                    <th className="px-4 py-3">Conformité</th>
                    <th className="px-4 py-3 text-right">Docs</th>
                    <th className="px-4 py-3 text-right">Certifications</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sellers.map((s) => (
                    <tr key={s.sellerProfileId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {s.publicDisplayName || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.sellerProfileStatus}</td>
                      <td className="px-4 py-3">
                        <ComplianceBadge status={s.complianceStatus} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {s.documentsVerified}/{s.documentsTotal}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {s.certificationsVerified}/{s.certificationsTotal}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/sellers?id=${s.sellerProfileId}`}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
