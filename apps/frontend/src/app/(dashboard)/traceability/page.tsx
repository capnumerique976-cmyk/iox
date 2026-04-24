'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, GitBranch, QrCode, ArrowRight } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { TraceabilityPanel } from '@/components/traceability/timeline';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BatchSearchResult {
  id: string;
  code: string;
  status: string;
  quantity: number;
  unit: string;
  product: { name: string; code: string };
}

const BATCH_STATUS_CLS: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-600',
  AVAILABLE: 'bg-green-100 text-green-700',
  READY_FOR_VALIDATION: 'bg-yellow-100 text-yellow-700',
  BLOCKED: 'bg-red-100 text-red-600',
  RESERVED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  DESTROYED: 'bg-red-50 text-red-400',
};

const BATCH_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Créé',
  AVAILABLE: 'Disponible',
  READY_FOR_VALIDATION: 'À valider',
  BLOCKED: 'Bloqué',
  RESERVED: 'Réservé',
  SHIPPED: 'Expédié',
  DESTROYED: 'Détruit',
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function TraceabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [batchId, setBatchId] = useState<string | null>(searchParams.get('batch') ?? null);
  const [batchInfo, setBatchInfo] = useState<BatchSearchResult | null>(null);
  const [results, setResults] = useState<BatchSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* Si batchId en URL → charger directement */
  useEffect(() => {
    if (!batchId) return;
    const load = async () => {
      try {
        const token = authStorage.getAccessToken();
        const res = await fetch(`/api/v1/product-batches/${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setBatchId(null);
          return;
        }
        const json = await res.json();
        const b = json.data ?? json;
        setBatchInfo({
          id: b.id,
          code: b.code,
          status: b.status,
          quantity: b.quantity,
          unit: b.unit,
          product: { name: b.product?.name ?? '—', code: b.product?.code ?? '—' },
        });
      } catch {
        setBatchId(null);
      }
    };
    load();
  }, [batchId]);

  /* Recherche par code */
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams({ search: q.trim(), limit: '10' });
      const res = await fetch(`/api/v1/product-batches?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de recherche');
      const json = await res.json();
      setResults(json.data?.data ?? []);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBatchId(null);
    setBatchInfo(null);
    search(query);
  };

  const selectBatch = (b: BatchSearchResult) => {
    setBatchId(b.id);
    setBatchInfo(b);
    setResults([]);
    setQuery(b.code);
    router.replace(`/traceability?batch=${b.id}&q=${encodeURIComponent(b.code)}`);
  };

  const reset = () => {
    setBatchId(null);
    setBatchInfo(null);
    setResults([]);
    setQuery('');
    router.replace('/traceability');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-blue-600" />
          Traçabilité
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Recherchez un lot fini pour visualiser sa chaîne de traçabilité complète
        </p>
      </div>

      {/* Barre de recherche */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
      >
        <label className="text-sm font-medium text-gray-700">Code du lot fini</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) {
                  setResults([]);
                }
              }}
              placeholder="Ex: PB-2024-001"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {searching ? 'Recherche…' : 'Rechercher'}
          </button>
          {batchId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Vous pouvez aussi accéder à la traçabilité directement depuis la fiche d'un lot fini
          (onglet Traçabilité).
        </p>
      </form>

      {/* Erreur recherche */}
      {searchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchError}
        </div>
      )}

      {/* Résultats de recherche */}
      {results.length > 0 && !batchId && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">
              {results.length} lot{results.length > 1 ? 's' : ''} trouvé
              {results.length > 1 ? 's' : ''}
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {results.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => selectBatch(b)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    <div>
                      <span className="font-mono font-medium text-blue-600">{b.code}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {b.product.name} · {b.quantity} {b.unit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BATCH_STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {BATCH_STATUS_LABELS[b.status] ?? b.status}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length === 0 && !batchId && query && !searching && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Aucun lot fini trouvé pour « {query} »
        </div>
      )}

      {/* Lot sélectionné + panneau de traçabilité */}
      {batchId && batchInfo && (
        <div className="space-y-4">
          {/* Entête lot */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-mono font-semibold text-blue-800">{batchInfo.code}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {batchInfo.product.name} · {batchInfo.quantity} {batchInfo.unit}
                </p>
              </div>
              <span
                className={`ml-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BATCH_STATUS_CLS[batchInfo.status] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {BATCH_STATUS_LABELS[batchInfo.status] ?? batchInfo.status}
              </span>
            </div>
            <Link
              href={`/product-batches/${batchId}`}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
            >
              Voir la fiche complète <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Panel de traçabilité */}
          <TraceabilityPanel batchId={batchId} />
        </div>
      )}

      {/* État vide initial */}
      {!batchId && results.length === 0 && !query && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
          <GitBranch className="h-12 w-12 text-gray-200 mx-auto" />
          <p className="text-sm font-medium text-gray-500">Aucun lot sélectionné</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Entrez le code d'un lot fini pour visualiser sa traçabilité complète : lot entrant,
            transformation, décisions qualité, distributions.
          </p>
        </div>
      )}
    </div>
  );
}
