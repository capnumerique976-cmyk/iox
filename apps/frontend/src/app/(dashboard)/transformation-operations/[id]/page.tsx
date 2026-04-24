'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wrench,
  ChevronRight,
  AlertTriangle,
  Plus,
  Package,
  FileText,
} from 'lucide-react';
import { UserRole } from '@iox/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { DocumentsPanel } from '@/components/documents/documents-panel';

interface OpDetail {
  id: string;
  code: string;
  name: string;
  description?: string;
  operationDate: string;
  site?: string;
  yieldRate?: number;
  operatorNotes?: string;
  inboundBatch: {
    id: string;
    code: string;
    quantity: number;
    unit: string;
    status: string;
    product: { id: string; code: string; name: string };
    supplier: { id: string; name: string };
  };
  productBatches: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    unit: string;
    productionDate: string;
  }[];
  _count: { productBatches: number };
  createdAt: string;
}

const CAN_CREATE_BATCH = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

export default function TransformationOpDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [op, setOp] = useState<OpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'info' | 'docs'>('info');

  const fetchOp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/transformation-operations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Opération introuvable' : 'Erreur serveur');
      const json = await res.json();
      setOp(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOp();
  }, [fetchOp]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (error || !op)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Opération introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );

  const canCreateBatch = user && CAN_CREATE_BATCH.includes(user.role);

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link
            href="/transformation-operations"
            className="hover:text-blue-600 flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Transformations
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{op.code}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-500 p-3">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{op.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {op.code} · {op.inboundBatch.product.name} ·{' '}
                {new Date(op.operationDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/transformation-operations/${op.id}/edit`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Modifier
            </Link>
            {canCreateBatch && (
              <Link
                href={`/product-batches/new?transformationOpId=${op.id}&productId=${op.inboundBatch.product.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Créer un lot fini
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
        {[
          { key: 'info' as const, label: 'Informations', icon: Wrench },
          { key: 'docs' as const, label: 'Documents', icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'docs' && (
        <DocumentsPanel linkedEntityType="TRANSFORMATION_OPERATION" linkedEntityId={op.id} />
      )}

      {tab === 'info' && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Taux de transformation
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {op.yieldRate != null ? `${op.yieldRate} %` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Lots finis produits
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{op._count.productBatches}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Matière source
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {op.inboundBatch.quantity} {op.inboundBatch.unit}
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Lot entrant source</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Code</span>
                  <Link
                    href={`/inbound-batches/${op.inboundBatch.id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {op.inboundBatch.code}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Produit</span>
                  <span className="text-gray-900">{op.inboundBatch.product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fournisseur</span>
                  <span className="text-gray-900">{op.inboundBatch.supplier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut</span>
                  <StatusBadge status={op.inboundBatch.status} type="inboundBatch" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Détails de l'opération</h3>
              <div className="space-y-2 text-sm">
                {op.site && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Site</span>
                    <span className="text-gray-900">{op.site}</span>
                  </div>
                )}
                {op.description && (
                  <div>
                    <span className="text-gray-500 block mb-1">Description</span>
                    <p className="text-gray-900">{op.description}</p>
                  </div>
                )}
                {op.operatorNotes && (
                  <div>
                    <span className="text-gray-500 block mb-1">Notes opérateur</span>
                    <p className="text-gray-900">{op.operatorNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lots finis */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Lots finis issus de cette opération
              </h3>
            </div>
            {op.productBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <Package className="h-8 w-8" />
                <p className="text-sm">Aucun lot fini créé</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Quantité</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Date de production
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {op.productBatches.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => router.push(`/product-batches/${b.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-blue-600">{b.code}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} type="batch" />
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {b.quantity} {b.unit}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(b.productionDate).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
