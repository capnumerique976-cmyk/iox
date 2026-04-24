'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import {
  MarketplaceDocumentVisibility,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  UserRole,
} from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import {
  marketplaceDocumentsApi,
  MarketplaceDocumentRow,
  ReviewQueueItem,
} from '@/lib/marketplace-documents';

interface Props {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  /** EntityType utilisé côté /documents pour filtrer les sources disponibles. */
  sourceEntityType: string;
}

const CAN_MANAGE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKETPLACE_SELLER,
];

const VISIBILITY_LABEL: Record<MarketplaceDocumentVisibility, string> = {
  [MarketplaceDocumentVisibility.PRIVATE]: 'Privé',
  [MarketplaceDocumentVisibility.BUYER_ON_REQUEST]: 'Sur demande',
  [MarketplaceDocumentVisibility.PUBLIC]: 'Public',
};

function VisibilityBadge({ v }: { v: MarketplaceDocumentVisibility }) {
  const map: Record<MarketplaceDocumentVisibility, { cls: string; Icon: typeof Lock }> = {
    [MarketplaceDocumentVisibility.PRIVATE]: {
      cls: 'bg-gray-100 text-gray-700 border-gray-200',
      Icon: Lock,
    },
    [MarketplaceDocumentVisibility.BUYER_ON_REQUEST]: {
      cls: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: EyeOff,
    },
    [MarketplaceDocumentVisibility.PUBLIC]: {
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: Eye,
    },
  };
  const { cls, Icon } = map[v];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${cls}`}
      data-testid={`visibility-badge-${v}`}
    >
      <Icon className="h-3 w-3" /> {VISIBILITY_LABEL[v]}
    </span>
  );
}

function StatusBadge({
  status,
  expired,
}: {
  status: MarketplaceVerificationStatus;
  expired: boolean;
}) {
  if (expired) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800"
        data-testid="status-badge-EXPIRED"
      >
        <AlertTriangle className="h-3 w-3" /> Expiré
      </span>
    );
  }
  const map: Record<
    MarketplaceVerificationStatus,
    { cls: string; Icon: typeof Clock; label: string }
  > = {
    [MarketplaceVerificationStatus.PENDING]: {
      cls: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: Clock,
      label: 'En attente',
    },
    [MarketplaceVerificationStatus.VERIFIED]: {
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: CheckCircle2,
      label: 'Vérifié',
    },
    [MarketplaceVerificationStatus.REJECTED]: {
      cls: 'bg-red-50 text-red-800 border-red-200',
      Icon: XCircle,
      label: 'Rejeté',
    },
    [MarketplaceVerificationStatus.EXPIRED]: {
      cls: 'bg-red-50 text-red-800 border-red-200',
      Icon: AlertTriangle,
      label: 'Expiré',
    },
  };
  const { cls, Icon, label } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${cls}`}
      data-testid={`status-badge-${status}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() <= Date.now();
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
}

export function MarketplaceDocumentsPanel({ relatedType, relatedId, sourceEntityType }: Props) {
  const { user } = useAuth();
  const canManage = user ? CAN_MANAGE.includes(user.role) : false;

  const [rows, setRows] = useState<MarketplaceDocumentRow[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewQueueItem | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<MarketplaceDocumentRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const list = await marketplaceDocumentsApi.list({ relatedType, relatedId }, token);
      setRows(list.data);
      // Chargement en parallèle des items de revue pour chaque doc PENDING/REJECTED
      const entries = await Promise.all(
        list.data.map(async (d) => {
          try {
            const r = await marketplaceDocumentsApi.reviewItemsFor(d.id, token);
            const latest = r.data[0] ?? null;
            return [d.id, latest] as const;
          } catch {
            return [d.id, null] as const;
          }
        }),
      );
      setReviews(Object.fromEntries(entries));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [relatedType, relatedId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = async (id: string) => {
    try {
      const token = authStorage.getAccessToken() ?? '';
      const r = await marketplaceDocumentsApi.getUrl(id, token);
      window.open(r.url, '_blank');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Détacher ce document de la marketplace ? (le fichier source sera conservé)'))
      return;
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceDocumentsApi.remove(id, token);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4" data-testid="marketplace-documents-panel">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Documents marketplace</h3>
          <p className="text-xs text-gray-500">
            Certificats, COA, fiches techniques liés à cette entité. Seuls les documents publics +
            vérifiés + non expirés sont visibles des acheteurs.
          </p>
        </div>
        {canManage && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            data-testid="btn-create-marketplace-document"
          >
            <Plus className="h-3.5 w-3.5" /> Attacher un document
          </button>
        )}
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {showCreate && canManage && (
        <CreateForm
          relatedType={relatedType}
          relatedId={relatedId}
          sourceEntityType={sourceEntityType}
          onCancel={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
          onError={setError}
        />
      )}

      {editTarget && canManage && (
        <EditForm
          doc={editTarget}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-gray-300 bg-white py-10 text-gray-400">
          <FileText className="h-6 w-6" />
          <p className="text-sm">Aucun document marketplace attaché</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded border border-gray-200 bg-white">
          {rows.map((d) => {
            const expired = isExpired(d.validUntil);
            const review = reviews[d.id];
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-start gap-3 p-4"
                data-testid={`md-row-${d.id}`}
              >
                <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{d.title}</p>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                      {d.documentType}
                    </span>
                    <VisibilityBadge v={d.visibility} />
                    <StatusBadge status={d.verificationStatus} expired={expired} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.document.originalFilename} · ajouté {formatDate(d.createdAt)}
                    {d.validFrom || d.validUntil ? (
                      <>
                        {' · '}
                        <span className={expired ? 'font-medium text-red-600' : ''}>
                          Validité : {formatDate(d.validFrom)} → {formatDate(d.validUntil)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {review?.status === 'REJECTED' && review.reviewReason && (
                    <div
                      className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800"
                      data-testid={`reject-reason-${d.id}`}
                    >
                      <strong>Motif du rejet :</strong> {review.reviewReason}
                    </div>
                  )}
                  {review?.status === 'PENDING' && (
                    <p className="text-xs italic text-amber-700">
                      En attente de revue par l'équipe qualité
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleDownload(d.id)}
                    title="Télécharger"
                    className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                    data-testid={`md-download-${d.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => setEditTarget(d)}
                        title="Modifier"
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                        data-testid={`md-edit-${d.id}`}
                      >
                        <Upload className="h-4 w-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        title="Détacher"
                        className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        data-testid={`md-delete-${d.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  Sous-composants de formulaire
 * ──────────────────────────────────────────────────────────────────── */

interface CreateFormProps {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  sourceEntityType: string;
  onCancel: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}

function CreateForm({
  relatedType,
  relatedId,
  sourceEntityType,
  onCancel,
  onCreated,
  onError,
}: CreateFormProps) {
  const [sources, setSources] = useState<
    Array<{ id: string; name: string; originalFilename: string }>
  >([]);
  const [documentId, setDocumentId] = useState('');
  const [documentType, setDocumentType] = useState('CERT_BIO');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<MarketplaceDocumentVisibility>(
    MarketplaceDocumentVisibility.PRIVATE,
  );
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = authStorage.getAccessToken() ?? '';
        const r = await marketplaceDocumentsApi.listSourceDocuments(
          { linkedEntityType: sourceEntityType, linkedEntityId: relatedId },
          token,
        );
        setSources(r.data ?? []);
      } catch (e) {
        onError((e as Error).message);
      }
    })();
  }, [sourceEntityType, relatedId, onError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !title.trim() || !documentType.trim()) return;
    setSubmitting(true);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceDocumentsApi.create(
        {
          relatedType,
          relatedId,
          documentId,
          documentType: documentType.trim(),
          title: title.trim(),
          visibility,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
        },
        token,
      );
      onCreated();
    } catch (e) {
      onError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded border border-blue-200 bg-blue-50 p-4"
      data-testid="md-create-form"
    >
      <h4 className="text-sm font-semibold text-blue-900">Attacher un document</h4>

      <div>
        <label htmlFor="md-source" className="mb-1 block text-xs font-medium text-gray-700">
          Document source *
        </label>
        <select
          id="md-source"
          required
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">— choisir un document existant —</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.originalFilename})
            </option>
          ))}
        </select>
        {sources.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Aucun document disponible pour cette entité. Téléversez-en un d'abord via la gestion
            documentaire.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="md-title" className="mb-1 block text-xs font-medium text-gray-700">
            Titre *
          </label>
          <input
            id="md-title"
            required
            minLength={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            placeholder="Ex. Certificat Ecocert 2026"
          />
        </div>
        <div>
          <label htmlFor="md-type" className="mb-1 block text-xs font-medium text-gray-700">
            Catégorie *
          </label>
          <input
            id="md-type"
            required
            minLength={2}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            placeholder="CERT_BIO, COA, FDS, FT…"
          />
        </div>
      </div>

      <div>
        <label htmlFor="md-visibility" className="mb-1 block text-xs font-medium text-gray-700">
          Visibilité
        </label>
        <select
          id="md-visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as MarketplaceDocumentVisibility)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value={MarketplaceDocumentVisibility.PRIVATE}>Privé (interne)</option>
          <option value={MarketplaceDocumentVisibility.BUYER_ON_REQUEST}>
            Sur demande (signalé aux acheteurs)
          </option>
          <option value={MarketplaceDocumentVisibility.PUBLIC}>Public (catalogue)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="md-valid-from" className="mb-1 block text-xs font-medium text-gray-700">
            Valide à partir de
          </label>
          <input
            id="md-valid-from"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="md-valid-until" className="mb-1 block text-xs font-medium text-gray-700">
            Expire le
          </label>
          <input
            id="md-valid-until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting || !documentId || !title.trim() || !documentType.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          data-testid="md-create-submit"
        >
          {submitting ? 'Envoi…' : 'Attacher'}
        </button>
      </div>
    </form>
  );
}

interface EditFormProps {
  doc: MarketplaceDocumentRow;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

function EditForm({ doc, onCancel, onSaved, onError }: EditFormProps) {
  const [title, setTitle] = useState(doc.title);
  const [documentType, setDocumentType] = useState(doc.documentType);
  const [visibility, setVisibility] = useState<MarketplaceDocumentVisibility>(doc.visibility);
  const isoDate = useCallback((iso: string | null) => (iso ? iso.slice(0, 10) : ''), []);
  const [validFrom, setValidFrom] = useState(isoDate(doc.validFrom));
  const [validUntil, setValidUntil] = useState(isoDate(doc.validUntil));
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceDocumentsApi.update(
        doc.id,
        {
          title: title.trim(),
          documentType: documentType.trim(),
          visibility,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
        },
        token,
      );
      onSaved();
    } catch (e) {
      onError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded border border-gray-300 bg-white p-4"
      data-testid={`md-edit-form-${doc.id}`}
    >
      <h4 className="text-sm font-semibold text-gray-900">Modifier : {doc.title}</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`md-edit-title-${doc.id}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Titre
          </label>
          <input
            id={`md-edit-title-${doc.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor={`md-edit-type-${doc.id}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Catégorie
          </label>
          <input
            id={`md-edit-type-${doc.id}`}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`md-edit-visibility-${doc.id}`}
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Visibilité
        </label>
        <select
          id={`md-edit-visibility-${doc.id}`}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as MarketplaceDocumentVisibility)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value={MarketplaceDocumentVisibility.PRIVATE}>Privé</option>
          <option value={MarketplaceDocumentVisibility.BUYER_ON_REQUEST}>Sur demande</option>
          <option value={MarketplaceDocumentVisibility.PUBLIC}>Public</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`md-edit-from-${doc.id}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Valide à partir de
          </label>
          <input
            id={`md-edit-from-${doc.id}`}
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor={`md-edit-until-${doc.id}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Expire le
          </label>
          <input
            id={`md-edit-until-${doc.id}`}
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {doc.verificationStatus === MarketplaceVerificationStatus.VERIFIED && (
        <p className="text-xs text-amber-700">
          ⚠ Modifier la visibilité, la catégorie ou l'expiration repassera ce document en{' '}
          <strong>attente de vérification</strong>.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          data-testid={`md-edit-submit-${doc.id}`}
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

/** Export utilitaires testables. */
export const __test__ = { VisibilityBadge, StatusBadge, isExpired };
