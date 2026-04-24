'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Edit2,
  ChevronRight,
  FileText,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { ProductStatus, UserRole, PRODUCT_STATUS_TRANSITIONS } from '@iox/shared';
import { StatusBadge, PRODUCT_STATUS_CONFIG } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface LabelValidation {
  id: string;
  isValid: boolean;
  reservations: string[];
  validatedAt: string;
}

interface ProductDetail {
  id: string;
  code: string;
  name: string;
  commercialName?: string;
  category: string;
  description?: string;
  origin?: string;
  transformationSite?: string;
  packagingSpec?: string;
  productionCapacity?: number;
  unit?: string;
  ingredients?: string;
  allergens: string[];
  shelfLife?: string;
  storageConditions?: string;
  labelingInfo?: string;
  nutritionalInfo?: string;
  technicalNotes?: string;
  status: ProductStatus;
  version: number;
  beneficiary: { id: string; code: string; name: string };
  documents: { id: string; title: string; status: string; createdAt: string }[];
  productBatches: { id: string; code: string; status: string; createdAt: string }[];
  _count: { productBatches: number; documents: number };
  createdAt: string;
  updatedAt: string;
}

const CAN_EDIT = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.BENEFICIARY_MANAGER,
  UserRole.QUALITY_MANAGER,
];
const CAN_CHANGE_STATUS = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKET_VALIDATOR,
];

type Tab = 'info' | 'fiche' | 'lots' | 'docs';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ProductStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/products/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Produit introuvable');
        throw new Error('Erreur lors du chargement du produit');
      }
      const json = await res.json();
      setProduct(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleChangeStatus = async () => {
    if (!newStatus || !product) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/products/${product.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, reason: statusReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Transition invalide');
      }
      setStatusModal(false);
      setNewStatus('');
      setStatusReason('');
      fetchProduct();
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Produit introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );
  }

  const canEdit = user && CAN_EDIT.includes(user.role);
  const canChangeStatus = user && CAN_CHANGE_STATUS.includes(user.role);
  const allowedTransitions = PRODUCT_STATUS_TRANSITIONS[product.status] ?? [];
  const cfg = PRODUCT_STATUS_CONFIG[product.status];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/products" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Produits
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{product.code}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${cfg?.iconBg ?? 'bg-gray-400'}`}>
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.commercialName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Nom commercial : <span className="font-medium">{product.commercialName}</span>
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={product.status} type="product" />
                <span className="text-xs text-gray-400">v{product.version}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{product.beneficiary.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canChangeStatus && allowedTransitions.length > 0 && (
              <button
                onClick={() => setStatusModal(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Changer le statut
              </button>
            )}
            {canEdit && (
              <Link
                href={`/products/${product.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lots produits</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{product._count.productBatches}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documents</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{product._count.documents}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Catégorie</p>
          <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{product.category}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {(
            [
              { key: 'info', label: 'Informations générales', icon: Package },
              { key: 'fiche', label: 'Fiche technique', icon: FileText },
              { key: 'lots', label: `Lots (${product._count.productBatches})`, icon: Layers },
              { key: 'docs', label: `Documents (${product._count.documents})`, icon: FileText },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'docs' && (
        <DocumentsPanel linkedEntityType="PRODUCT" linkedEntityId={product.id} />
      )}
      <div
        className={`rounded-lg border border-gray-200 bg-white p-6 ${activeTab === 'docs' ? 'hidden' : ''}`}
      >
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <Field label="Code" value={product.code} mono />
            <Field
              label="Bénéficiaire"
              value={`${product.beneficiary.name} (${product.beneficiary.code})`}
            />
            <Field label="Catégorie" value={product.category} />
            <Field label="Origine" value={product.origin} />
            <Field label="Site de transformation" value={product.transformationSite} />
            <Field
              label="Capacité de production"
              value={
                product.productionCapacity
                  ? `${product.productionCapacity} ${product.unit ?? ''}`
                  : undefined
              }
            />
            <Field label="Description" value={product.description} wide />
            <Field
              label="Dernière mise à jour"
              value={new Date(product.updatedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        )}

        {activeTab === 'fiche' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Emballage / Conditionnement" value={product.packagingSpec} wide />
              <Field label="Ingrédients" value={product.ingredients} wide />
            </div>

            {/* Allergènes */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Allergènes
              </p>
              {product.allergens.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Aucun allergène déclaré
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.allergens.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Field label="Durée de conservation (DLC/DLUO)" value={product.shelfLife} />
              <Field label="Conditions de stockage" value={product.storageConditions} />
              <Field label="Informations d'étiquetage" value={product.labelingInfo} wide />
              <Field label="Informations nutritionnelles" value={product.nutritionalInfo} wide />
              <Field label="Notes techniques" value={product.technicalNotes} wide />
            </div>
          </div>
        )}

        {activeTab === 'lots' && (
          <div>
            {product.productBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <Layers className="h-8 w-8" />
                <p className="text-sm">Aucun lot fini pour ce produit</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left font-medium text-gray-500">Code</th>
                    <th className="pb-2 text-left font-medium text-gray-500">Statut</th>
                    <th className="pb-2 text-left font-medium text-gray-500">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {product.productBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-blue-600">{b.code}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Status change modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Changer le statut</h2>
            <p className="text-sm text-gray-500">
              Statut actuel : <StatusBadge status={product.status} type="product" />
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Nouveau statut</label>
              <div className="grid gap-2">
                {allowedTransitions.map((s) => {
                  const c = PRODUCT_STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm text-left transition-colors ${
                        newStatus === s
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${c?.dot ?? 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-900">{c?.label ?? s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Précisez le motif du changement de statut…"
              />
            </div>

            {statusError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{statusError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setStatusModal(false);
                  setNewStatus('');
                  setStatusReason('');
                  setStatusError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={!newStatus || statusLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {statusLoading ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component
function Field({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  wide?: boolean;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
