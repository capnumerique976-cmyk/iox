'use client';

// MP-OFFER-VIEW (LOT 1 mandat 14) — Détail seller d'une offre marketplace
// **en lecture seule**. L'édition arrive avec MP-OFFER-EDIT-1 (LOT 2).
//
// Pattern partiel miroir de `seller/marketplace-products/[id]/page.tsx`.
// Pas de form state, pas de PATCH — uniquement des sections lecture +
// banner publicationStatus + liens retour.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Package,
  Truck,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceOffersApi,
  type MarketplaceOfferDetail,
} from '@/lib/marketplace-offers';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; offer: MarketplaceOfferDetail };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange-50 text-orange-800 border-orange-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  PUBLISHED: 'Publiée',
  REJECTED: 'Rejetée',
  SUSPENDED: 'Suspendue',
  ARCHIVED: 'Archivée',
};

function fmtNum(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-FR');
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('fr-FR');
  } catch {
    return s;
  }
}

function fmtDestinations(d: MarketplaceOfferDetail['destinationMarketsJson']): string {
  if (!d) return '—';
  if (Array.isArray(d)) return d.map(String).join(', ') || '—';
  if (typeof d === 'object') {
    const keys = Object.keys(d);
    if (keys.length === 0) return '—';
    return keys.map((k) => `${k}: ${String((d as Record<string, unknown>)[k])}`).join(', ');
  }
  return String(d);
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}
function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  testid?: string;
}
function Section({ title, icon, children, testid }: SectionProps) {
  return (
    <section
      data-testid={testid}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-premium-sm"
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {icon}
        {title}
      </h2>
      <dl>{children}</dl>
    </section>
  );
}

export default function SellerMarketplaceOfferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!id) return;
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const offer = await marketplaceOffersApi.getById(id, token);
      setState({ kind: 'ready', offer });
    } catch (err) {
      if (err instanceof ApiError) {
        setState({ kind: 'error', message: err.message, status: err.status });
      } else {
        const message = err instanceof Error ? err.message : 'Offre indisponible';
        setState({ kind: 'error', message });
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l’offre…
      </div>
    );
  }

  if (state.kind === 'error') {
    const isForbidden = state.status === 403;
    const isNotFound = state.status === 404;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Offre marketplace"
          actions={
            <Link
              href="/seller/marketplace-offers"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Mes offres
            </Link>
          }
        />
        <div
          role="alert"
          data-testid="offer-error-banner"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {isForbidden ? (
              <p className="mt-1 text-xs text-red-700">
                Vous n’êtes pas propriétaire de cette offre. Vérifiez votre profil
                vendeur ou contactez le support.
              </p>
            ) : null}
            {isNotFound ? (
              <p className="mt-1 text-xs text-red-700">
                Cette offre n’existe plus ou a été archivée.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const o = state.offer;
  const statusClass = STATUS_BADGE[o.publicationStatus] ?? STATUS_BADGE.DRAFT;
  const statusLabel = STATUS_LABEL[o.publicationStatus] ?? o.publicationStatus;

  return (
    <div className="space-y-5">
      <PageHeader
        title={o.title}
        subtitle={
          o.marketplaceProduct?.commercialName
            ? `Offre rattachée à ${o.marketplaceProduct.commercialName}`
            : 'Offre marketplace'
        }
        actions={
          <div className="flex items-center gap-2">
            {o.marketplaceProductId ? (
              <Link
                href={`/seller/marketplace-products/${o.marketplaceProductId}`}
                data-testid="offer-link-product"
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Package className="h-3 w-3" /> Produit parent
              </Link>
            ) : null}
            <Link
              href="/seller/marketplace-offers"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Mes offres
            </Link>
          </div>
        }
      />

      <div
        data-testid="offer-status-banner"
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${statusClass}`}
      >
        {o.publicationStatus === 'PUBLISHED' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
        <span className="font-semibold uppercase tracking-wider">{statusLabel}</span>
        <span className="text-xs opacity-80">
          (lecture seule — l’édition est introduite par MP-OFFER-EDIT-1)
        </span>
      </div>

      <Section title="Identité" testid="offer-section-identity">
        <Row label="Titre" value={o.title} />
        <Row label="Description courte" value={o.shortDescription ?? '—'} />
      </Section>

      <Section title="Produit lié" testid="offer-section-product" icon={<Package className="h-4 w-4 text-gray-400" />}>
        <Row
          label="Produit marketplace"
          value={
            o.marketplaceProduct ? (
              <Link
                href={`/seller/marketplace-products/${o.marketplaceProductId}`}
                className="text-premium-accent underline-offset-2 hover:underline"
              >
                {o.marketplaceProduct.commercialName}
              </Link>
            ) : (
              o.marketplaceProductId
            )
          }
        />
        <Row label="Slug produit" value={o.marketplaceProduct?.slug ?? '—'} />
        <Row label="Statut produit" value={o.marketplaceProduct?.publicationStatus ?? '—'} />
      </Section>

      <Section title="Prix" testid="offer-section-price">
        <Row label="Mode" value={o.priceMode} />
        <Row label="Prix unitaire" value={`${fmtNum(o.unitPrice)} ${o.currency ?? ''}`.trim()} />
        <Row label="Devise" value={o.currency ?? '—'} />
        <Row label="MOQ" value={fmtNum(o.moq)} />
        <Row label="Quantité disponible" value={fmtNum(o.availableQuantity)} />
      </Section>

      <Section title="Disponibilité" testid="offer-section-availability">
        <Row label="Début" value={fmtDate(o.availabilityStart)} />
        <Row label="Fin" value={fmtDate(o.availabilityEnd)} />
        <Row label="Délai (jours)" value={o.leadTimeDays ?? '—'} />
      </Section>

      <Section title="Logistique commerciale" testid="offer-section-logistics" icon={<Truck className="h-4 w-4 text-gray-400" />}>
        <Row label="Incoterm" value={o.incoterm ?? '—'} />
        <Row label="Lieu de départ" value={o.departureLocation ?? '—'} />
        <Row label="Marchés destination" value={fmtDestinations(o.destinationMarketsJson)} />
      </Section>

      <Section title="Visibilité" testid="offer-section-visibility">
        <Row label="Scope" value={o.visibilityScope} />
      </Section>

      <Section title="Workflow" testid="offer-section-workflow">
        <Row label="Statut publication" value={o.publicationStatus} />
        <Row label="Statut export readiness" value={o.exportReadinessStatus} />
        <Row label="Featured rank" value={o.featuredRank ?? '—'} />
        <Row label="Soumis à revue" value={fmtDate(o.submittedAt)} />
        <Row label="Approuvée" value={fmtDate(o.approvedAt)} />
        <Row label="Publiée" value={fmtDate(o.publishedAt)} />
        <Row label="Suspendue" value={fmtDate(o.suspendedAt)} />
        <Row label="Mise à jour" value={fmtDate(o.updatedAt)} />
        {o.rejectionReason ? <Row label="Motif rejet" value={o.rejectionReason} /> : null}
      </Section>
    </div>
  );
}
