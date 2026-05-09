'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText, Plus, Upload } from 'lucide-react';
import { MarketplaceRelatedEntityType, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { verificationStatusLabel } from '@/lib/status-labels';

const CAN_VIEW = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
  UserRole.MARKETPLACE_SELLER,
];

const ENTITY_LABEL: Record<MarketplaceRelatedEntityType, string> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'Profil vendeur',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'Produit',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'Offre',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'Lot',
};

// Labels de verification importes depuis @/lib/status-labels

/** Labels humains pour la visibilité. */
const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Privé',
  INTERNAL: 'Interne',
};

/** Styles pour les badges de vérification. */
const VERIFICATION_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface Row {
  id: string;
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  title: string;
  verificationStatus: string;
  visibility: string;
  createdAt: string;
}

interface ListResponse {
  data: Row[];
  meta: unknown;
}

export default function SellerDocumentsHubPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = authStorage.getAccessToken() ?? '';
        const r = await api.get<ListResponse>('/marketplace/documents?limit=50', token);
        setRows(r.data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => {
      const key = `${r.relatedType}:${r.relatedId}`;
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    });
    return [...m.entries()].map(([key, items]) => ({
      key,
      relatedType: items[0].relatedType,
      relatedId: items[0].relatedId,
      items,
    }));
  }, [rows]);

  if (user && !CAN_VIEW.includes(user.role)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Votre rôle ne permet pas d'accéder à cette page. Contactez un administrateur si besoin.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes documents"
        subtitle="Certificats, fiches techniques et justificatifs liés à vos produits"
        actions={
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </Link>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Chargement…</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Upload className="h-7 w-7 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Vous n'avez pas encore de document
            </p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              Ajoutez vos certificats et fiches techniques pour rassurer les acheteurs et accélérer la validation de vos produits.
            </p>
          </div>
          <Link
            href="/seller/marketplace-products"
            className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-4 py-2 text-sm font-semibold text-white shadow-premium-sm hover:bg-premium-primary"
          >
            <Plus className="h-4 w-4" />
            Ajouter depuis un produit
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {grouped.map((g) => (
            <li
              key={g.key}
              className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {ENTITY_LABEL[g.relatedType]}
                  </p>
                  <p className="truncate text-xs text-gray-400">{g.relatedId}</p>
                </div>
                <Link
                  href={`/seller/documents/${encodeURIComponent(g.relatedType)}/${encodeURIComponent(g.relatedId)}`}
                  className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-medium text-white shadow-premium-sm hover:bg-premium-primary"
                >
                  Gérer <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="space-y-1.5">
                {g.items.slice(0, 5).map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <FileText className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate">{it.title}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        VERIFICATION_STYLE[it.verificationStatus] ??
                        'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {verificationStatusLabel(it.verificationStatus)}
                    </span>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {VISIBILITY_LABEL[it.visibility] ?? it.visibility}
                    </span>
                  </li>
                ))}
                {g.items.length > 5 && (
                  <li className="text-xs italic text-gray-400">
                    + {g.items.length - 5} autre(s)
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
