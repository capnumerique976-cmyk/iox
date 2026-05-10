'use client';

// M57 — Page conformité vendeur.
// Affiche le statut de conformité du vendeur (documents, certifications, profil).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

/* ─── Types ─────────────────────────────────────────────────────────── */

type ComplianceStatus = 'COMPLETE' | 'ACTION_REQUIRED' | 'PENDING_REVIEW' | 'BLOCKED' | 'INCOMPLETE';

interface SellerComplianceSummary {
  status: ComplianceStatus;
  completionPercentage: number;
  sellerProfileStatus: string;
  sellerProfileRejectionReason: string | null;
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  totalCertifications: number;
  verifiedCertifications: number;
  pendingCertifications: number;
  rejectedCertifications: number;
  expiredCertifications: number;
  expiringSoonCertifications: number;
  pendingReviewItems: number;
  nextAction: string | null;
}

/* ─── Label / couleur selon statut ──────────────────────────────────── */

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  COMPLETE: {
    label: 'Conforme',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200',
  },
  ACTION_REQUIRED: {
    label: 'Action requise',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200',
  },
  PENDING_REVIEW: {
    label: 'En cours de vérification',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200',
  },
  BLOCKED: {
    label: 'Bloqué',
    bgClass: 'bg-red-200',
    textClass: 'text-red-900',
    borderClass: 'border-red-300',
  },
  INCOMPLETE: {
    label: 'Incomplet',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200',
  },
};

/* ─── Composant interne : carte stat ────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
  color,
}: {
  icon: typeof CheckCircle;
  label: string;
  value: number;
  testId?: string;
  color: 'green' | 'yellow' | 'red' | 'orange';
}) {
  const colorMap = {
    green: { icon: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    yellow: { icon: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    red: { icon: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    orange: { icon: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  };
  const c = colorMap[color];

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-center gap-3`}
      data-testid={testId}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm`}>
        <Icon className={`h-5 w-5 ${c.icon}`} aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────── */

export default function SellerCompliancePage() {
  const [data, setData] = useState<SellerComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    setLoading(true);
    setError(null);

    fetch('/api/v1/compliance/seller/summary', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json() as Promise<SellerComplianceSummary>;
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Empty state total ── */
  const isEmptyState = data
    ? data.totalDocuments === 0 && data.totalCertifications === 0
    : false;

  const statusCfg = data ? STATUS_CONFIG[data.status] : null;

  return (
    <div className="space-y-6" data-testid="compliance-page">
      <PageHeader
        title="Ma conformité"
        subtitle="Suivez vos documents et certifications pour vendre sereinement sur IOX."
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* ── État chargement ── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* ── État erreur ── */}
      {!loading && error && (
        <div
          data-testid="compliance-error"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Impossible de charger votre conformité : {error}
        </div>
      )}

      {/* ── Contenu principal ── */}
      {!loading && data && (
        <>
          {/* Carte statut global */}
          <div className={`rounded-xl border ${statusCfg!.borderClass} ${statusCfg!.bgClass} px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Statut global</p>
              <span
                data-testid="compliance-status-badge"
                className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusCfg!.bgClass} ${statusCfg!.textClass}`}
              >
                {statusCfg!.label}
              </span>
              {data.nextAction && (
                <p
                  data-testid="compliance-next-action"
                  className="mt-2 text-sm text-gray-700"
                >
                  {data.nextAction}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{data.completionPercentage}%</p>
              <p className="text-xs text-gray-500">de complétion</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div data-testid="compliance-progress-bar" className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Documents vérifiés</span>
              <span>{data.completionPercentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.min(data.completionPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Alertes */}
          {(data.rejectedDocuments > 0 || data.rejectedCertifications > 0) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Documents ou certifications refusés.</strong> Corrigez-les pour continuer à vendre.
            </div>
          )}

          {data.sellerProfileRejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Votre profil a été refusé :</strong> {data.sellerProfileRejectionReason}
            </div>
          )}

          {/* Grid compteurs */}
          {!isEmptyState && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={CheckCircle}
                label="Documents vérifiés"
                value={data.verifiedDocuments}
                testId="compliance-verified-count"
                color="green"
              />
              <StatCard
                icon={Clock}
                label="En attente"
                value={data.pendingDocuments + data.pendingCertifications}
                testId="compliance-pending-count"
                color="yellow"
              />
              <StatCard
                icon={XCircle}
                label="Refusés"
                value={data.rejectedDocuments + data.rejectedCertifications}
                testId="compliance-rejected-count"
                color="red"
              />
              <StatCard
                icon={AlertTriangle}
                label="Expirent bientôt"
                value={data.expiringSoonDocuments + data.expiringSoonCertifications}
                color="orange"
              />
            </div>
          )}

          {/* Section certifications */}
          {data.totalCertifications > 0 && (
            <section className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Certifications</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={CheckCircle}
                  label="Certifications vérifiées"
                  value={data.verifiedCertifications}
                  color="green"
                />
                <StatCard
                  icon={Clock}
                  label="En attente"
                  value={data.pendingCertifications}
                  color="yellow"
                />
                <StatCard
                  icon={XCircle}
                  label="Refusées"
                  value={data.rejectedCertifications}
                  color="red"
                />
              </div>
            </section>
          )}

          {/* CTAs conditionnels */}
          <div className="flex flex-wrap gap-3">
            {data.status === 'COMPLETE' && (
              <Link
                href="/seller/marketplace-products"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Voir mes produits <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {data.rejectedDocuments > 0 && (
              <Link
                href="/seller/documents"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Corriger mes documents <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {data.totalDocuments === 0 && !isEmptyState && (
              <Link
                href="/seller/documents"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ajouter mes documents <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {data.status === 'PENDING_REVIEW' && (
              <p className="flex items-center gap-2 text-sm text-blue-700">
                <Clock className="h-4 w-4" />
                Votre dossier est en cours de vérification. Aucune action requise.
              </p>
            )}
          </div>

          {/* Empty state */}
          {isEmptyState && (
            <EmptyState
              data-testid="compliance-empty-state"
              icon={<FileText className="h-8 w-8" />}
              title="Aucun document renseigné"
              description="Ajoutez vos documents et certifications pour rassurer les acheteurs et accéder à toutes les fonctionnalités IOX."
              action={
                <Link
                  href="/seller/documents"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Ajouter un document <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
