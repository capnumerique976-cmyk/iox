'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { MarketplaceRelatedEntityType, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { api } from '@/lib/api';

const CAN_VIEW = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
  UserRole.MARKETPLACE_SELLER,
];

const LABEL: Record<MarketplaceRelatedEntityType, string> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'Profil vendeur',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'Produit marketplace',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'Offre marketplace',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'Lot produit',
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Votre rôle ne permet pas d'accéder à la gestion documentaire marketplace.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Documents marketplace</h1>
        <p className="text-sm text-gray-600">
          Vue centrale des certificats, COA et fiches techniques liés à vos entités marketplace. Le
          staff qualité vérifie ces documents avant leur exposition publique.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Chargement…</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-gray-300 bg-white py-12 text-gray-400">
          <FileText className="h-7 w-7" />
          <p className="text-sm">Aucun document marketplace attaché pour l'instant.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded border border-gray-200 bg-white">
          {grouped.map((g) => (
            <li key={g.key} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{LABEL[g.relatedType]}</p>
                  <p className="font-mono text-xs text-gray-500">{g.relatedId}</p>
                </div>
                <Link
                  href={`/seller/documents/${encodeURIComponent(g.relatedType)}/${encodeURIComponent(g.relatedId)}`}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Gérer <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="space-y-1">
                {g.items.slice(0, 5).map((it) => (
                  <li key={it.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate">{it.title}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">
                      {it.verificationStatus}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">
                      {it.visibility}
                    </span>
                  </li>
                ))}
                {g.items.length > 5 && (
                  <li className="text-xs italic text-gray-400">+ {g.items.length - 5} autre(s)</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
