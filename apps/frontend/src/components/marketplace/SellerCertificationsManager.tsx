'use client';

// FP-2.1 — Manager certifications réutilisable (seller).
//
// Composant unique paramétré par {relatedType, relatedId} : sert pour
// `/seller/profile/certifications` (SELLER_PROFILE) et
// `/seller/marketplace-products/[id]/certifications` (MARKETPLACE_PRODUCT).
//
// Cycles UX :
//   1. Charge la liste via GET /marketplace/certifications?relatedType&relatedId.
//   2. Permet de basculer en mode "création" (formulaire vide) ou "édition"
//      (formulaire pré-rempli sur une certif existante).
//   3. Soumission → POST ou PATCH puis re-fetch → reset form.
//   4. Suppression : ouvre `useConfirm()` (ConfirmDialog L9-2) puis DELETE.
//
// Hors scope (différé à FP-3.1+) :
//   - Pas de champ `documentMediaId` : on n'a pas encore d'uploader PDF
//     intégré côté seller. Documenté dans `docs/marketplace/SELLER_PROFILE.md`.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceCertificationsApi,
  type CreateMarketplaceCertificationInput,
  type MarketplaceCertification,
  type UpdateMarketplaceCertificationInput,
} from '@/lib/marketplace-certifications';
import {
  CertificationType,
  MarketplaceVerificationStatus,
  type MarketplaceRelatedEntityType,
} from '@iox/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Props {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  /** Désactive globalement les actions (ex. pendant un autre chargement parent). */
  disabled?: boolean;
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: MarketplaceCertification[] };

interface FormState {
  /** `null` = création, sinon édition d'une certif existante. */
  editingId: string | null;
  type: CertificationType;
  code: string;
  issuingBody: string;
  issuedAt: string;
  validFrom: string;
  validUntil: string;
}

const EMPTY_FORM: FormState = {
  editingId: null,
  type: CertificationType.BIO_EU,
  code: '',
  issuingBody: '',
  issuedAt: '',
  validFrom: '',
  validUntil: '',
};

/** Libellés FR des types de certification. */
const TYPE_LABELS: Record<CertificationType, string> = {
  BIO_EU: 'Bio EU',
  BIO_USDA: 'Bio USDA',
  ECOCERT: 'Ecocert',
  FAIRTRADE: 'Fairtrade',
  RAINFOREST_ALLIANCE: 'Rainforest Alliance',
  HACCP: 'HACCP',
  ISO_22000: 'ISO 22000',
  ISO_9001: 'ISO 9001',
  GLOBALGAP: 'GlobalG.A.P.',
  BRC: 'BRC',
  IFS: 'IFS',
  KOSHER: 'Kosher',
  HALAL: 'Halal',
  OTHER: 'Autre (préciser code/organisme)',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  VERIFIED: 'Vérifiée',
  REJECTED: 'Rejetée',
  EXPIRED: 'Expirée',
};

/** YYYY-MM-DD pour <input type="date"> à partir d'une date ISO côté backend. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/**
 * Statut affiché : on dérive `EXPIRED` à la volée à partir de `validUntil`,
 * conformément à la convention backend (qui ne stocke pas EXPIRED, voir
 * `findPublic`).
 */
function displayStatus(c: MarketplaceCertification): string {
  if (
    c.verificationStatus === MarketplaceVerificationStatus.VERIFIED &&
    c.validUntil &&
    new Date(c.validUntil).getTime() <= Date.now()
  ) {
    return 'EXPIRED';
  }
  return c.verificationStatus;
}

export function SellerCertificationsManager({ relatedType, relatedId, disabled }: Props) {
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await marketplaceCertificationsApi.list(
        { relatedType, relatedId, page: 1, limit: 50 },
        token,
      );
      setState({ kind: 'ready', rows: res.data });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Impossible de charger les certifications';
      setState({ kind: 'error', message });
    }
  }, [relatedType, relatedId]);

  useEffect(() => {
    if (relatedId) load();
  }, [relatedId, load]);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setSubmitError(null);
    setValidationError(null);
    setSuccess(null);
  }, []);

  const openEdit = useCallback((cert: MarketplaceCertification) => {
    setForm({
      editingId: cert.id,
      type: cert.type,
      code: cert.code ?? '',
      issuingBody: cert.issuingBody ?? '',
      issuedAt: toDateInput(cert.issuedAt),
      validFrom: toDateInput(cert.validFrom),
      validUntil: toDateInput(cert.validUntil),
    });
    setFormOpen(true);
    setSubmitError(null);
    setValidationError(null);
    setSuccess(null);
  }, []);

  const cancelForm = useCallback(() => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setValidationError(null);
  }, []);

  /**
   * Validation client miroir backend (volontairement légèrement plus tolérante :
   * on accepte `validUntil === validFrom` côté UI, le backend lui exige `>`,
   * et on n'interdit pas `validUntil` dans le passé en édition — il faut
   * pouvoir corriger une coquille sans bloquer).
   */
  function validate(f: FormState): string | null {
    if (f.type === CertificationType.OTHER && !f.code.trim() && !f.issuingBody.trim()) {
      return 'Type "Autre" : précisez au moins un code ou un organisme émetteur.';
    }
    if (f.validFrom && f.validUntil && f.validFrom > f.validUntil) {
      return 'La date "valide à partir de" doit être antérieure ou égale à "valide jusqu’au".';
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    if (v) {
      setValidationError(v);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setValidationError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      // PATCH : on n'envoie QUE les champs que le formulaire couvre — pour
      // les chaînes vides, on envoie `undefined` plutôt qu'une chaîne vide
      // (le DTO refuse `MinLength(1)` sur `code` et `issuingBody`).
      const payloadBase: UpdateMarketplaceCertificationInput = {
        code: form.code.trim() || undefined,
        issuingBody: form.issuingBody.trim() || undefined,
        issuedAt: form.issuedAt || undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      };
      if (form.editingId) {
        await marketplaceCertificationsApi.update(form.editingId, payloadBase, token);
        setSuccess('Certification mise à jour.');
      } else {
        const createPayload: CreateMarketplaceCertificationInput = {
          relatedType,
          relatedId,
          type: form.type,
          ...payloadBase,
        };
        await marketplaceCertificationsApi.create(createPayload, token);
        setSuccess('Certification ajoutée — en attente de vérification.');
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await load();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as unknown;
        if (Array.isArray(details) && details.length > 0) {
          setSubmitError(details.map((d) => String(d)).join(' · '));
        } else {
          setSubmitError(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Échec de l’enregistrement.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(cert: MarketplaceCertification) {
    const ok = await confirm({
      title: 'Supprimer cette certification ?',
      description:
        cert.verificationStatus === MarketplaceVerificationStatus.VERIFIED
          ? 'Action irréversible. Cette certification est actuellement vérifiée — elle disparaîtra immédiatement de votre vitrine publique.'
          : 'Action irréversible.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(cert.id);
    setSubmitError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceCertificationsApi.remove(cert.id, token);
      setSuccess('Certification supprimée.');
      await load();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Suppression impossible.';
      setSubmitError(message);
    } finally {
      setDeletingId(null);
    }
  }

  const sortedRows = useMemo(() => {
    if (state.kind !== 'ready') return [];
    // Mêmes priorités que le backend : statut PENDING en haut, puis par date.
    return [...state.rows].sort((a, b) => {
      const order = ['PENDING', 'REJECTED', 'VERIFIED', 'EXPIRED'];
      const ra = order.indexOf(displayStatus(a));
      const rb = order.indexOf(displayStatus(b));
      if (ra !== rb) return ra - rb;
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    });
  }, [state]);

  return (
    <div className="space-y-4" data-testid="seller-certifications-manager">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Certifications déclarées</h2>
        {!formOpen && (
          <button
            type="button"
            onClick={openCreate}
            disabled={disabled || state.kind === 'loading'}
            data-testid="cert-add-btn"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        )}
      </div>

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      )}

      {state.kind === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {state.kind === 'ready' && sortedRows.length === 0 && !formOpen && (
        <div
          className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
          data-testid="cert-empty"
        >
          Aucune certification déclarée pour le moment.
        </div>
      )}

      {state.kind === 'ready' && sortedRows.length > 0 && (
        <ul className="space-y-2" data-testid="cert-list">
          {sortedRows.map((cert) => {
            const status = displayStatus(cert);
            return (
              <li
                key={cert.id}
                data-testid={`cert-row-${cert.id}`}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-premium-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {TYPE_LABELS[cert.type] ?? cert.type}
                      </span>
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BADGE[status] ?? STATUS_BADGE.PENDING}`}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-gray-600 sm:grid-cols-2">
                      {cert.issuingBody && (
                        <div>
                          <span className="font-medium text-gray-500">Organisme :</span>{' '}
                          {cert.issuingBody}
                        </div>
                      )}
                      {cert.code && (
                        <div>
                          <span className="font-medium text-gray-500">Code :</span> {cert.code}
                        </div>
                      )}
                      {cert.validFrom && (
                        <div>
                          <span className="font-medium text-gray-500">Valide dès :</span>{' '}
                          {toDateInput(cert.validFrom)}
                        </div>
                      )}
                      {cert.validUntil && (
                        <div>
                          <span className="font-medium text-gray-500">Jusqu’au :</span>{' '}
                          {toDateInput(cert.validUntil)}
                        </div>
                      )}
                    </div>
                    {cert.verificationStatus === MarketplaceVerificationStatus.REJECTED &&
                      cert.rejectionReason && (
                        <p className="mt-2 rounded-md border border-red-100 bg-red-50/60 p-2 text-xs text-red-800">
                          <span className="font-semibold">Motif de rejet :</span>{' '}
                          {cert.rejectionReason}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(cert)}
                      disabled={disabled || submitting || deletingId === cert.id}
                      data-testid={`cert-edit-${cert.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="h-3 w-3" /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(cert)}
                      disabled={disabled || submitting || deletingId === cert.id}
                      data-testid={`cert-delete-${cert.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === cert.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <form
          onSubmit={onSubmit}
          data-testid="cert-form"
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-premium-sm"
          noValidate
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {form.editingId ? 'Modifier la certification' : 'Nouvelle certification'}
            </h3>
            <button
              type="button"
              onClick={cancelForm}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-700">
              Type *
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as CertificationType }))
                }
                disabled={!!form.editingId || submitting}
                data-testid="cert-field-type"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {Object.values(CertificationType).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              {form.editingId && (
                <span className="mt-0.5 block text-[10px] text-gray-400">
                  Le type n’est pas modifiable. Supprimez puis recréez si nécessaire.
                </span>
              )}
            </label>

            <label className="text-xs font-medium text-gray-700">
              Organisme émetteur
              <input
                type="text"
                value={form.issuingBody}
                onChange={(e) => setForm((f) => ({ ...f, issuingBody: e.target.value }))}
                disabled={submitting}
                maxLength={120}
                placeholder="ex. Ecocert, Bureau Veritas…"
                data-testid="cert-field-issuingBody"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Code / numéro de licence
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={submitting}
                maxLength={120}
                placeholder="ex. FR-BIO-01-2026-001"
                data-testid="cert-field-code"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Date d’émission
              <input
                type="date"
                value={form.issuedAt}
                onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                disabled={submitting}
                data-testid="cert-field-issuedAt"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Valide à partir du
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                disabled={submitting}
                data-testid="cert-field-validFrom"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Valide jusqu’au
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                disabled={submitting}
                data-testid="cert-field-validUntil"
                className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
          </div>

          {validationError && (
            <div
              role="alert"
              data-testid="cert-validation-error"
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {validationError}
            </div>
          )}
          {submitError && (
            <div
              role="alert"
              data-testid="cert-submit-error"
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              data-testid="cert-submit"
              className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm hover:bg-premium-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {form.editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
