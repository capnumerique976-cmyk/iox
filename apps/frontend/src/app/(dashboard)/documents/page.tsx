'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  Download,
  Archive,
  Eye,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { useAuth } from '@/contexts/auth.context';
import { UserRole } from '@iox/shared';

const CAN_UPLOAD: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

/* Mapping EntityType → endpoint de listing + champ searchable */
const ENTITY_SEARCH_ENDPOINTS: Record<
  string,
  { url: string; format: (e: any) => { id: string; label: string; sub?: string } }
> = {
  BENEFICIARY: {
    url: '/api/v1/beneficiaries?limit=20',
    format: (e) => ({ id: e.id, label: e.name, sub: e.code }),
  },
  PRODUCT: {
    url: '/api/v1/products?limit=20',
    format: (e) => ({ id: e.id, label: e.name, sub: e.code }),
  },
  INBOUND_BATCH: {
    url: '/api/v1/inbound-batches?limit=20',
    format: (e) => ({ id: e.id, label: e.code, sub: e.product?.name }),
  },
  PRODUCT_BATCH: {
    url: '/api/v1/product-batches?limit=20',
    format: (e) => ({ id: e.id, label: e.code, sub: e.product?.name }),
  },
  SUPPLY_CONTRACT: {
    url: '/api/v1/supply-contracts?limit=20',
    format: (e) => ({ id: e.id, label: e.code, sub: e.supplier?.name }),
  },
  INCIDENT: {
    url: '/api/v1/incidents?limit=20',
    format: (e) => ({ id: e.id, label: e.code, sub: e.title }),
  },
  DISTRIBUTION: {
    url: '/api/v1/distributions?limit=20',
    format: (e) => ({ id: e.id, label: e.code, sub: e.beneficiary?.name }),
  },
};

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Document {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  linkedEntityType: string;
  linkedEntityId: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const ENTITY_TYPE_LABELS: Record<string, string> = {
  BENEFICIARY: 'Bénéficiaire',
  PRODUCT: 'Produit',
  INBOUND_BATCH: 'Lot entrant',
  PRODUCT_BATCH: 'Lot fini',
  SUPPLY_CONTRACT: 'Contrat appro.',
  INCIDENT: 'Incident',
};

const ENTITY_TYPE_HREFS: Record<string, (id: string) => string> = {
  BENEFICIARY: (id) => `/beneficiaries/${id}`,
  PRODUCT: (id) => `/products/${id}`,
  INBOUND_BATCH: (id) => `/inbound-batches/${id}`,
  PRODUCT_BATCH: (id) => `/product-batches/${id}`,
  SUPPLY_CONTRACT: (id) => `/supply-contracts/${id}`,
  INCIDENT: (id) => `/incidents/${id}`,
};

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-red-100 text-red-600',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  ARCHIVED: 'Archivé',
  EXPIRED: 'Expiré',
  PENDING: 'En attente',
};

const ENTITY_TYPE_OPTIONS = Object.keys(ENTITY_TYPE_LABELS);
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canUpload = user ? CAN_UPLOAD.includes(user.role) : false;

  const [showUpload, setShowUpload] = useState(false);

  const [docs, setDocs] = useState<Document[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('linkedEntityType') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'ACTIVE');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (typeFilter) params.set('linkedEntityType', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setDocs(json.data?.data ?? json.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* Filtre local par nom */
  const filtered = search.trim()
    ? docs.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.originalFilename.toLowerCase().includes(search.toLowerCase()),
      )
    : docs;

  /* Télécharger un document */
  const downloadDoc = async (docId: string, filename: string) => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/documents/${docId}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const url = json.data?.url ?? json.url;
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.click();
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} document${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" /> Téléverser
          </button>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            fetchDocs();
          }}
        />
      )}

      {/* Filtres */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou fichier…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les types d'entité</option>
            {ENTITY_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {ENTITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setTypeFilter('');
              setStatusFilter('ACTIVE');
              setSearch('');
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <FileText className="h-10 w-10" />
            <p className="text-sm">Aucun document trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Entité liée</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taille</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Expiration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ajouté le</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doc) => {
                const entityHref = ENTITY_TYPE_HREFS[doc.linkedEntityType]?.(doc.linkedEntityId);
                const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    {/* Nom */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-48">{doc.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-48">
                            {doc.originalFilename}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type MIME */}
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                        {MIME_LABELS[doc.mimeType] ??
                          doc.mimeType.split('/')[1]?.toUpperCase() ??
                          'FICHIER'}
                      </span>
                    </td>

                    {/* Entité liée */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-400">
                        {ENTITY_TYPE_LABELS[doc.linkedEntityType] ?? doc.linkedEntityType}
                      </div>
                      {entityHref ? (
                        <Link
                          href={entityHref}
                          className="text-blue-600 hover:underline text-xs font-mono"
                        >
                          Voir →
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs font-mono">
                          {doc.linkedEntityId.slice(0, 8)}…
                        </span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[doc.status] ?? doc.status}
                      </span>
                    </td>

                    {/* Taille */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatBytes(doc.sizeBytes)}
                    </td>

                    {/* Expiration */}
                    <td className="px-4 py-3 text-xs">
                      {doc.expiresAt ? (
                        <span className={isExpired ? 'text-red-500 font-medium' : 'text-gray-500'}>
                          {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                          {isExpired && ' ⚠'}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Date ajout */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {entityHref && (
                          <Link
                            href={entityHref}
                            title="Voir l'entité liée"
                            className="rounded p-1 text-gray-300 hover:text-gray-500 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => downloadDoc(doc.id, doc.originalFilename)}
                          title="Télécharger"
                          className="rounded p-1 text-gray-300 hover:text-blue-500 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {meta.page} sur {meta.totalPages} — {meta.total} résultat
            {meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Note upload */}
      <p className="text-xs text-gray-400">
        Vous pouvez aussi téléverser un document depuis la fiche de chaque entité (lot fini,
        produit, contrat, etc.).
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload modal global                                                 */
/* ------------------------------------------------------------------ */

interface EntityOption {
  id: string;
  label: string;
  sub?: string;
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [entityType, setEntityType] = useState<string>('PRODUCT_BATCH');
  const [entityQuery, setEntityQuery] = useState('');
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState('');
  const [entityLabel, setEntityLabel] = useState('');

  const [docName, setDocName] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPicker = useMemo(() => Boolean(ENTITY_SEARCH_ENDPOINTS[entityType]), [entityType]);

  /* Charge les entités quand le type change ou que l'utilisateur tape */
  useEffect(() => {
    if (!hasPicker || entityId) return;
    const cfg = ENTITY_SEARCH_ENDPOINTS[entityType];
    if (!cfg) return;

    const token = authStorage.getAccessToken();
    const url =
      cfg.url + (entityQuery.trim() ? `&search=${encodeURIComponent(entityQuery.trim())}` : '');

    const controller = new AbortController();
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        const list = (j.data?.data ?? j.data ?? []) as any[];
        setEntityOptions(list.map(cfg.format));
      })
      .catch(() => {
        /* silencieux */
      });

    return () => controller.abort();
  }, [entityType, entityQuery, entityId, hasPicker]);

  const resetEntity = () => {
    setEntityId('');
    setEntityLabel('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Sélectionnez un fichier');
      return;
    }
    if (!entityId) {
      setError('Sélectionnez une entité liée');
      return;
    }
    if (!docName.trim()) {
      setError('Le nom du document est obligatoire');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', docName.trim());
      formData.append('linkedEntityType', entityType);
      formData.append('linkedEntityId', entityId);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (expiresAt) formData.append('expiresAt', new Date(expiresAt).toISOString());

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || 'Téléversement impossible');
      }
      onUploaded();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Téléverser un document</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4 p-5">
          {/* Type d'entité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'entité liée <span className="text-red-500">*</span>
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                resetEntity();
                setEntityOptions([]);
                setEntityQuery('');
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ENTITY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Entité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entité <span className="text-red-500">*</span>
            </label>
            {entityId ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2">
                <span className="text-sm font-medium text-blue-700">{entityLabel}</span>
                <button
                  type="button"
                  onClick={resetEntity}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Changer
                </button>
              </div>
            ) : hasPicker ? (
              <>
                <input
                  type="text"
                  value={entityQuery}
                  onChange={(e) => setEntityQuery(e.target.value)}
                  placeholder="Rechercher par code ou nom…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {entityOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">Aucun résultat</div>
                  ) : (
                    entityOptions.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        onClick={() => {
                          setEntityId(o.id);
                          setEntityLabel(`${o.label}${o.sub ? ' — ' + o.sub : ''}`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-800">{o.label}</span>
                        {o.sub && <span className="text-xs text-gray-500">{o.sub}</span>}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <input
                type="text"
                value={entityId}
                onChange={(e) => {
                  setEntityId(e.target.value);
                  setEntityLabel(e.target.value);
                }}
                placeholder="UUID de l'entité"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Fichier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom affiché <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Contrat signé…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expire le</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? 'Envoi…' : 'Téléverser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
